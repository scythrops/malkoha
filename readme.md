Malkoha
===

Dynamic routes for Hapi.js with support for add, override, update, and delete of routes.

Special Notes
---

Malkoha implements a concept that is native to Hapi, the idea of being able to
"delete" a route from the routing table.  This is done by removing the route
handler and not the route configuration itself.  This may cause "issues" so
be careful if you decide to use it.

Because of the way that Malkoha works you may experience race conditions when
adding, updating, overriding, or deleting routes.  You should never expect it
to work the right way 100% of the time.  Your users may see 500's and/or your
application may simply crash.  Always test, test, and test some more.

Install
---

```shell
npm install malkoha
```

Usage
---

```js
const {Malkoha} = require('malkoha');
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: 3000 });

const greet = (req, reply)=>{
  const {
    name = 'World'
  } = req.params;
  return reply(`Hello ${name}!`)
};

server.register(Malkoha, (err)=>{
  const m = server.malkoha;

  // Add some routes
  m.route([
      {
        method: 'GET',
        path: '/hello',
        handler(request, reply){
          reply('Hello!');
        }
      },
      {
        method: 'GET',
        path: '/greet/{person}',
        handler(request, reply){
          reply(`Hello ${request.params.person}!`);
        }
      }
    ]);

  // Change what they do some time later
  m.route([
      {
        method: 'GET',
        path: '/hello',
        handler: greet
      },
      {
        method: 'GET',
        path: '/greet/{name}',
        handler: greet
      }
    ]);

  // Delete ones you don't need
  m.delete([
      {
        method: 'GET',
        path: '/hello',
        handler: greet
      }
    ]);

  server.start((err) => {
    if(err){
      throw err;
    }
    console.log('Server running at:', server.info.uri);
  });
});
```

API
===

route(routes)
---

Takes a route or array of routes and adds them to the Malkoha routing table.

delete(routes)
---

Takes a route or array of routes and removes them to the Malkoha routing table.

**NOTE:** Malkoha can not remove a route that was added to the server instance.

Testing
===

```shell
npm test
```
