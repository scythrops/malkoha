const Call = require('call');
const Hoek = require('hoek');
const Joi = require('joi');

const Handler = Joi.alternatives([
  Joi.func(),
  Joi.object({
    statusCode: Joi.number().positive().integer().min(200).default(200),
    headers: Joi.object(),
    payload: Joi.required()
  }),
  Joi.object({
    isBoom: true
  }).unknown()
]);

const route = Joi.alternatives([
    Joi.object({
      method: Joi.string().regex(/^[a-zA-Z0-9!#\$%&'\*\+\-\.^_`\|~]+$/).lowercase().default('get'),
      path: Joi.string().required(),
      handler: Handler,
      vhost: Joi.array().items(Joi.string().hostname()).min(1).single().default(['*']),
      filter: Joi.func().optional(),
    }),
    Joi.object({
      method: Joi.string().regex(/^[a-zA-Z0-9!#\$%&'\*\+\-\.^_`\|~]+$/).lowercase().default('get'),
      path: Joi.string().required(),
      config: Joi.object({
          handler: Handler
        }).unknown(),
      vhost: Joi.array().items(Joi.string().hostname()).min(1).single().default(['*']),
      filter: Joi.func().optional(),
    }),
  ]);

const simplifyPath = (str)=>{
  return str.replace(/{[^}]+}/gi, ()=>'{token}');
};

class Malkoha{
  constructor(server){
    this.server = server;
    this._routes = [];

    Hoek.assert(this.server.connections.length, 'Cannot malkoha a server without any connections');
  }

  getRoute(route){
    const index = this.indexOf(route);
    return index>-1?this._routes[index]:false;
  }

  indexOf(route){
    const {
      method,
      path
    } = route;
    const pathSearchable = simplifyPath(path);
    return this._routes.findIndex((route)=>{
      return (route.method.toUpperCase() === method.toUpperCase()) && (simplifyPath(route.path) === pathSearchable);
    });
  }

  route(options){
    const routes = Array.isArray(options)?options:[options];
    const connections = this.server.connections;
    routes.forEach((config)=>{
      const settings = Joi.attempt(Hoek.clone(config), route);
      let cfg = this.getRoute(settings);
      if(cfg){
        cfg.handler = settings.handler || false;
        cfg.config = settings.config;
        cfg.tags = settings.tags;
        cfg.filter = settings.filter;
        cfg.validate = settings.validate;
        cfg.path = settings.path;
        return;
      }

      this._routes.push(settings);
      connections.forEach((connection)=>{
        if(connection.plugins.malkoha){
          const router = connection.plugins.malkoha._router;

          settings.vhost.forEach((vhost)=>{
            router.add({ method: settings.method, path: settings.path, vhost: vhost }, settings);
          });
        }
      });
    });
  }

  delete(options){
    const routes = Array.isArray(options)?options:[options];
    routes.forEach((route)=>{
      const index = this.indexOf(route);
      if(index > -1){
        this._routes[index].handler = false;
      }
    });
  }
}

const onRequest = (req, reply)=>{
  const router = req.connection.plugins.malkoha._router;
  const match = router.route(req.method, req.path, req.info.hostname);
  if(match.isBoom){
    return reply.continue();
  }

  const handler = match.route.handler || (match.route.config||{}).handler;
  if(!handler){
    return reply.continue();
  }

  const respond = ()=>{
    if(typeof(handler) === 'function'){
      return handler(Object.assign({}, req, match), reply);
    }

    if(handler.isBoom){
      return reply(handler);
    }

    return reply(handler.payload).code(handler.statusCode);
  };

  if(!match.route.filter){
    return respond();
  }

  match.route.filter(req, (isMatch)=>{
    if(isMatch){
      return respond();
    }
    return reply.continue();
  });
};

const MalkohaPlugin={
  register(server, options, next){
    server.connections.forEach((connection)=>{
      connection.plugins.malkoha = {
          _router: new Call.Router(connection.settings.router),
        };
    });

    const m = new Malkoha(server);
    server.decorate('server', 'malkoha', m);
    server.ext('onRequest', onRequest);

    return next();
  },
};

MalkohaPlugin.register.attributes = {
  pkg: require('../package.json')
};

module.exports = {
  Malkoha: MalkohaPlugin,
};
