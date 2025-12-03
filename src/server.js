const { app, bootstrap } = require('./app');
const { PORT } = require('./config');

bootstrap()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Request workflow API listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to bootstrap application', error);
    process.exit(1);
  });
