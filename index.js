const sqlite = require("sqlite"),
  Sequelize = require("sequelize"),
  request = require("request"),
  rp = require("request-promise"),
  express = require("express"),
  app = express(),
  axios = require('axios'),
  moment = require("moment"),
  recommendations = {};

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

//MODELS

recommendations.currentFilm = (req, res, next) => {
  const filmId = req.params.id;
  sequelize
    .query(`SELECT * FROM films WHERE films.id=${filmId}`)
    .then(film => {
      res.locals.currentFilm = film[0][0];
      console.log("CURRENT FILM TEST", film);
      next();
    })
    .catch(err => {
      console.log("THERE WAS AN ERROR", err);
      next(err);
    });
};
recommendations.genreMatch = (req, res, next) => {
  sequelize
    .query(
      `SELECT * FROM films WHERE films.genre_id=${
        res.locals.currentFilm.genre_id
      }`
    )
    .then(films => {
      res.locals.allMatches = films[0];
      // console.log('Matching Films',res.locals.allMatches);
      next();
    })
    .catch(err => {
      console.log("THERE Was an error at GENRE matc", err);
      next(err);
    });
};

recommendations.getReviews = (req, res, next) => {
  // console.log("Matching Films", res.locals.allMatches);
  
    res.locals.reviews = [];
     res.locals.allMatches.map(match => {
      axios(
        `http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${
          match.id
        }`
      ).then(response => {
        console.log("++++++++++++++CurrRev++++++++++++++:", response.data); // Print the HTML for the Google homepage.

        res.locals.reviews.push(response.data);
      });
    });

    next();
 
  

  console.log('LINE 80',res.locals.reviews);
};



recommendations.filter = (req, res, next) => {
  console.log("MOMENT OF TRUTH", res.locals.reviews);
  next();
};
// ROUTES
app.get(
  "/films/:id/recommendations",
  recommendations.currentFilm,
  recommendations.genreMatch,
  recommendations.getReviews,
  recommendations.filter,
  getFilmRecommendations
);

const sequelize = new Sequelize("main", null, null, {
  dialect: "sqlite",
  storage: DB_PATH
});

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  res.status(500).send("Not Implemented");
}

module.exports = app;
