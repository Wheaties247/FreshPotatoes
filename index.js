const sqlite = require("sqlite"),
  Sequelize = require("sequelize"),
  request = require("request"),
  express = require("express"),
  app = express(),
  moment = require('moment');

const {
  PORT = 3000,
  NODE_ENV = "development",
  DB_PATH = "./db/database.db"
} = process.env;

// START SERVER
Promise.resolve()
  .then(() =>
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`))
  )
  .catch(err => {
    if (NODE_ENV === "development") console.error(err.stack);
  });

// ROUTES
app.get("/films/:id/recommendations", getFilmRecommendations);

// const connection = new Sequelize('main', {
//         dialect: 'sqlite',
//          pool: {
//                 max: 5,
//                 min: 0,
//                 idle: 10000
//                   },
//         storage: './db/database.db'
//       });
const sequelize = new Sequelize("main", null, null, {
  dialect: "sqlite",
  storage: DB_PATH
});

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  let filmId = req.params.id;

  sequelize
    .query(`SELECT * FROM films WHERE films.id=${filmId}`)
    .then(film => {
      res.locals.currentFilm = film[0][0];
      console.log(film);
    })
    .then(() => {
      sequelize
        .query(
          `SELECT * FROM films WHERE films.genre_id=${
            res.locals.currentFilm.genre_id
          }`
        )
        .then(films => {
          console.log(
            `+++++++MATCHING GENRE+++++++${JSON.stringify(films[0])}`
          );
          res.locals.allMatches = films[0];
          console.log(
            `++++RES.LOCALS.currentFilm+++++`,
            res.locals.allMatches
          );
        });
    })
    .then(() => {
      res.locals.allMatches.forEach(match => {
        request(
          `http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${
            match.id
          }`,
          function(error, responce, body) {
            console.log("body:", body); // Print the HTML for the Google homepage.

            res.locals.allReviews = body;
            console.log("++++++++REVIEWS++++++++++", res.locals.allReviews);
          }
        );
      });
    });

  console.log("+++++++++++++++++++ TEST +++++++++++++++++++");

  // console.log(req.params.id);

  res.status(500).send("Not Implemented");
}

module.exports = app;
