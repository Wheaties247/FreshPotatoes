const sqlite = require("sqlite"),
  Sequelize = require("sequelize"),
  request = require("request"),
  rp = require("request-promise"),
  express = require("express"),
  app = express(),
  axios = require("axios"),
  moment = require("moment");

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

//Connect To Database
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_PATH,
  define: {
    timestamps: false
  }
});
sequelize
  .authenticate()
  .then(() => {
    console.log("CONNECTED");
  })
  .catch(err => {
    console.error("NOT CONNECTED TO DB", err);
  });

//MODELS
const Film = sequelize.define("film", {
  title: {
    type: Sequelize.STRING
  },
  release_date: {
    type: Sequelize.DATEONLY
  },
  tagline: {
    type: Sequelize.STRING
  },
  revenue: {
    type: Sequelize.INTEGER
  },
  budget: {
    type: Sequelize.INTEGER
  },
  runtime: {
    type: Sequelize.INTEGER
  },
  original_language: {
    type: Sequelize.STRING
  },
  status: {
    type: Sequelize.STRING
  },
  genre_id: {
    type: Sequelize.INTEGER
  }
});

const Genre = sequelize.define("genre", {
  name: {
    type: Sequelize.STRING
  }
});
const errorMsg = "ERROR bad request";
// ROUTES
app.get("/films/:id/recommendations", getFilmRecommendations);
app.get("*", function(req, res) {
  res.status(404).json({
    message: errorMsg
  });
});

function getFilmRecommendations(req, res) {
  // console.log('Running getFilmRecommendations');
  let limit = 10,
    offset = 0;
  console.log("REC.query", req.query);
  if (!Number.isInteger(parseInt(req.params.id, 10))) {
    res.status(422).json({
      message: errorMsg
    });
  }

  if (req.query.limit) {
    if (!Number.isInteger(parseInt(req.query.limit, 10))) {
      res.status(422).json({
        message: errorMsg
      });
    }

    limit = parseInt(req.query.limit, 10);
  }

  if (req.query.offset) {
    if (!Number.isInteger(parseInt(req.query.offset, 10))) {
      res.status(422).json({
        message: errorMsg
      });
    }

    offset = parseInt(req.query.offset, 10);
  }

  Film.findById(req.params.id, {})
    .then(film => {
      Genre.findById(film.genre_id, {})
        .then(genre => {
          let start_date = new Date(film.release_date);
          start_date.setFullYear(start_date.getFullYear() - 15);

          let end_date = new Date(film.release_date);
          end_date.setFullYear(end_date.getFullYear() + 15);

          Film.all({
            where: {
              genre_id: film.genre_id,
              release_date: {
                $between: [start_date, end_date]
              }
            },
            order: ["id"],
            offset: offset,
          })
            .then(films => {
              const film_ids = films.map(film => {
                return film.id;
              });

              const film_id_string = film_ids.join(",");

              // console.log('film_id_string', film_id_string);

              request(
                `http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${film_id_string}`,
                (err, response, body) => {
                  const reviewedFilms = JSON.parse(body);

                  // Must have 5 reviews at least
                  const at_least_5_film_reviews = reviewedFilms.filter(
                    reviewedFilm => {
                      return reviewedFilm.reviews.length >= 5;
                    }
                  );

                  
                  const reviewedFilmsWithAverage = at_least_5_film_reviews.map(
                    reviewedFilm => {
                      const totalRating = reviewedFilm.reviews.reduce(
                        (sum, val) => {
                          return sum + val.rating;
                        },
                        0
                      );

                      const averageRating =
                        totalRating / reviewedFilm.reviews.length;
                      reviewedFilm.average_rating = averageRating;

                      return reviewedFilm;
                    }
                  );

                  // Has to have more than average 4
                  const reviewedFilmsAboveAverage = reviewedFilmsWithAverage.filter(
                    reviewedFilm => {
                      return reviewedFilm.average_rating > 4;
                    }
                  );
                  const reviewedFilmsAboveAverageIds = reviewedFilmsAboveAverage.map(
                    film => {
                      return film.film_id;
                    }
                  );
        
                  Film.all({
                    attributes: ["id", "title", "release_date"],
                    where: { id: { in: reviewedFilmsAboveAverageIds } },
                    order: ["id"],
                    limit: limit
                  })
                    .then(recommendedFilms => {
                      const complete_recommended_films = recommendedFilms.map(
                        film => {
                          const matchedFilm = reviewedFilmsAboveAverage.filter(
                            element => {
                              return (element.film_id = film.id);
                            }
                          );

                          console.log("matchedFilm HREERE", matchedFilm);

                          return {
                            id: matchedFilm[0].film_id,
                            title: film.title,
                            releaseDate: film.release_date,
                            genre: genre.name,
                            averageRating: matchedFilm[0].average_rating,
                            reviews: matchedFilm[0].reviews.length
                          };
                        }
                      );
                      console.log("RIGHT BEFORE", offset);
                      res.json({
                        recommendations: complete_recommended_films,
                        meta: {
                          limit: limit,
                          offset: offset
                        }
                      });
                    })
                    .catch(err => {
                      res.status(500).json(err);
                    });
                }
              );
            })
            .catch(err => {
              res.status(500).json(err);
            });
        })
        .catch(err => {
          res.status(500).json(err);
        });
    })
    .catch(err => {
      res.status(500).json(err);
    });
}

module.exports = app;
