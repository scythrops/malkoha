const Code = require('code');
const {
  expect,
} = Code;
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const {
  describe,
  it,
  before,
  after,
} = lab;

const Hapi = require('hapi');

const {Malkoha} = require('../lib/index');

describe('Malkoha', ()=>{
  it('Should be registerable', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();
      done();
    });
  });

  it('Should be able to register a new route', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.malkoha.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(1);
        }
      });

      server.inject('/', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal(1);

        done();
      });
    });
  });

  it('Should be able to override a route', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(1);
        }
      });

      server.malkoha.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(2);
        }
      });

      server.inject('/', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal(2);

        done();
      });
    });
  });

  it('Should be able to update a route', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.malkoha.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(1);
        }
      });

      server.inject('/', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal(1);

        server.malkoha.route({
          path: '/',
          method: 'get',
          handler(req, reply){
            return reply(2);
          }
        });

        server.inject('/', (res)=>{
          expect(res.statusCode).to.equal(200);
          expect(res.result).to.equal(2);
          done();
        });
      });
    });
  });

  it('Should be able to update a config route', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.malkoha.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(1);
        }
      });

      server.inject('/', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal(1);

        server.malkoha.route({
          path: '/',
          method: 'get',
          config: {
            tags: ['test'],
            handler(req, reply){
              return reply(2);
            }
          }
        });

        server.inject('/', (res)=>{
          expect(res.statusCode).to.equal(200);
          expect(res.result).to.equal(2);
          done();
        });
      });
    });
  });

  it('Should be able to update a route with a config', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.malkoha.route({
        path: '/',
        method: 'get',
        config: {
          handler(req, reply){
            return reply(1);
          }
        }
      });

      server.inject('/', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal(1);

        server.malkoha.route({
          path: '/',
          method: 'get',
          config: {
            tags: ['test'],
            handler(req, reply){
              return reply(2);
            }
          }
        });

        server.inject('/', (res)=>{
          expect(res.statusCode).to.equal(200);
          expect(res.result).to.equal(2);
          done();
        });
      });
    });
  });

  it('Should be able to delete a route override', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(1);
        }
      });

      server.malkoha.route({
        path: '/',
        method: 'get',
        handler(req, reply){
          return reply(2);
        }
      });

      server.inject('/', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal(2);

        server.malkoha.delete({
          path: '/',
          method: 'get',
        });

        server.inject('/', (res)=>{
          expect(res.statusCode).to.equal(200);
          expect(res.result).to.equal(1);

          done();
        });
      });
    });
  });

  it('Should handle parameters', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.malkoha.route({
        path: '/{value}',
        method: 'get',
        handler(req, reply){
          return reply(req.params.value);
        }
      });

      server.inject('/foo', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('foo');

        done();
      });
    });
  });

  it('Should be able to match paths with different parameter names', (done)=>{
    const server = new Hapi.Server();
    server.connection();
    server.register(Malkoha, (err)=>{
      expect(err).to.not.exist();

      server.route({
        path: '/hello/{name}',
        method: 'get',
        handler(req, reply){
          return reply(req.params.name);
        }
      });

      server.malkoha.route({
        path: '/hello/{thing}',
        method: 'get',
        handler(req, reply){
          return reply(req.params.thing);
        }
      });

      server.inject('/hello/person', (res)=>{
        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('person');

        done();
      });
    });
  });
});
