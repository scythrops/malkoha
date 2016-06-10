'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Call = require('call');
var Hoek = require('hoek');
var Joi = require('joi');

var _route = Joi.object({
  method: Joi.string().regex(/^[a-zA-Z0-9!#\$%&'\*\+\-\.^_`\|~]+$/).lowercase().default('get'),
  path: Joi.string().required(),
  handler: Joi.alternatives([Joi.func(), Joi.object({
    statusCode: Joi.number().positive().integer().min(200).default(200),
    headers: Joi.object(),
    payload: Joi.required()
  }), Joi.object({
    isBoom: true
  }).unknown()]).required(),
  validate: Joi.object().unknown().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  vhost: Joi.array().items(Joi.string().hostname()).min(1).single().default(['*']),
  filter: Joi.func().optional()
});

var simplifyPath = function simplifyPath(str) {
  return str.replace(/{[^}]+}/gi, function () {
    return '{token}';
  });
};

var Malkoha = function () {
  function Malkoha(server) {
    _classCallCheck(this, Malkoha);

    this.server = server;
    this._routes = [];

    Hoek.assert(this.server.connections.length, 'Cannot malkoha a server without any connections');
  }

  _createClass(Malkoha, [{
    key: 'getRoute',
    value: function getRoute(route) {
      var index = this.indexOf(route);
      return index > -1 ? this._routes[index] : false;
    }
  }, {
    key: 'indexOf',
    value: function indexOf(route) {
      var method = route.method;
      var path = route.path;

      var pathSearchable = simplifyPath(path);
      return this._routes.findIndex(function (route) {
        return route.method.toUpperCase() === method.toUpperCase() && simplifyPath(route.path) === pathSearchable;
      });
    }
  }, {
    key: 'route',
    value: function route(options) {
      var _this = this;

      var routes = Array.isArray(options) ? options : [options];
      var connections = this.server.connections;
      routes.forEach(function (config) {
        var settings = Joi.attempt(Hoek.clone(config), _route);
        var cfg = _this.getRoute(settings);
        if (cfg) {
          cfg.handler = settings.handler;
          cfg.tags = settings.tags;
          cfg.filter = settings.filter;
          cfg.validate = settings.validate;
          cfg.path = settings.path;
          return;
        }

        _this._routes.push(settings);
        connections.forEach(function (connection) {
          if (connection.plugins.malkoha) {
            (function () {
              var router = connection.plugins.malkoha._router;

              settings.vhost.forEach(function (vhost) {
                router.add({ method: settings.method, path: settings.path, vhost: vhost }, settings);
              });
            })();
          }
        });
      });
    }
  }, {
    key: 'delete',
    value: function _delete(options) {
      var _this2 = this;

      var routes = Array.isArray(options) ? options : [options];
      routes.forEach(function (route) {
        var index = _this2.indexOf(route);
        if (index > -1) {
          _this2._routes[index].handler = false;
        }
      });
    }
  }]);

  return Malkoha;
}();

var onRequest = function onRequest(req, reply) {
  var router = req.connection.plugins.malkoha._router;
  var match = router.route(req.method, req.path, req.info.hostname);
  if (match.isBoom) {
    return reply.continue();
  }

  var handler = match.route.handler;
  if (!handler) {
    return reply.continue();
  }

  var respond = function respond() {
    if (typeof handler === 'function') {
      return handler(Object.assign({}, req, match), reply);
    }

    if (handler.isBoom) {
      return reply(handler);
    }

    return reply(handler.payload).code(handler.statusCode);
  };

  if (!match.route.filter) {
    return respond();
  }

  match.route.filter(req, function (isMatch) {
    if (isMatch) {
      return respond();
    }
    return reply.continue();
  });
};

var MalkohaPlugin = {
  register: function register(server, options, next) {
    server.connections.forEach(function (connection) {
      connection.plugins.malkoha = {
        _router: new Call.Router(connection.settings.router)
      };
    });

    var m = new Malkoha(server);
    server.decorate('server', 'malkoha', m);
    server.ext('onRequest', onRequest);

    return next();
  }
};

MalkohaPlugin.register.attributes = {
  pkg: require('../package.json')
};

module.exports = {
  Malkoha: MalkohaPlugin
};
//# sourceMappingURL=index.js.map