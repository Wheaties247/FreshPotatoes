const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const connection = new Sequelize('main', null, null, {
        dialect: 'sqlite',
        storage: './db/database.db'
      });
  const genres = connection.define('genres', {
    name: Sequelize.STRING
  });
  // const films = connection.define('films', {
  //   title: Sequelize.STRING,
  //   release_date: Sequelize.DATE
  // });
  connection.sync().then(()=>{
    // genres.findAll();
  })


const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;


// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);


// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  res.status(500).send('Not Implemented');
 
}

module.exports = app;
