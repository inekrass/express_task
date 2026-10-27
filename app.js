export default function createApp(express, bodyParser, createReadStream, crypto, http, mongoose) {
  const app = express();
  const login = 'inekrass';

  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS,DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type,ngrok-skip-browser-warning');
    res.type('text/plain');

    if (!req.path.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      const path = req.path.replace(/^\/+/, '/');
      return res.redirect(308, `${path}/${query}`);
    }

    next();
  });

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.get('/login/', (req, res) => {
    res.send(login);
  });

  app.get('/code/', (req, res, next) => {
    const path = decodeURIComponent(import.meta.url.substring(7));
    const stream = createReadStream(path);
    stream.on('error', next);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  });

  app.get('/sha1/:input/', (req, res) => {
    const hash = crypto.createHash('sha1').update(req.params.input).digest('hex');
    res.send(hash);
  });

  function requestResource(req, res) {
    const addr = req.query.addr ?? req.body?.addr;
    let url;

    try {
      if (typeof addr !== 'string') throw new Error();
      url = new URL(addr);
      if (url.protocol !== 'http:') throw new Error();
    } catch {
      return res.status(400).send('addr must be a valid HTTP URL');
    }

    function fail() {
      if (res.destroyed) return;
      if (res.headersSent) return res.destroy();
      res.status(502).send('Unable to fetch the resource');
    }

    const request = http.get(url, (response) => {
      response.on('error', fail);
      response.pipe(res);
    });

    const timeout = setTimeout(() => request.destroy(), 10000);
    request.on('error', fail);
    res.on('close', () => {
      clearTimeout(timeout);
      request.destroy();
    });
  }

  app.get('/req/', requestResource);
  app.post('/req/', requestResource);

  app.post('/insert/', async (req, res) => {
    const { login, password, URL } = req.body ?? {};

    if (typeof login !== 'string' || typeof password !== 'string' ||
        typeof URL !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(URL)) {
      return res.status(400).send('login, password and a MongoDB URL are required');
    }

    const connection = new mongoose.Mongoose().createConnection();
    let stage = 'connect';

    try {
      await connection.openUri(URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        autoIndex: false
      });
      stage = 'insert';
      const schema = new mongoose.Schema({ login: String, password: String }, { versionKey: false });
      const User = connection.model('User', schema, 'users');
      await User.create({ login, password });
      res.send('OK');
    } catch (error) {
      process.stderr.write(`${JSON.stringify({ event: 'mongo_insert_error', stage, error: error.name, code: error.code })}\n`);
      res.status(502).send('Unable to insert user');
    } finally {
      await connection.close().catch(() => {});
    }
  });

  app.all(/.*/, (req, res) => {
    res.send(login);
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return res.destroy();
    const status = error.status || 500;
    res.status(status).send(status < 500 ? 'Invalid request' : 'Internal server error');
  });

  return app;
}
