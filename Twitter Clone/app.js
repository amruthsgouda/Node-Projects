const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server hosted at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Server and Db error: ${error.message}`);
    process.exit(1);
  }
};

initializeServerAndDb();

//API1 - register new user
app.post("/register/", async (request, response) => {
  try {
    const { username, password, name, gender } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbResponse = await db.get(selectUserQuery);
    if (dbResponse === undefined) {
      const isValidPassword = password.length;
      if (isValidPassword > 6) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const postUserQuery = `INSERT INTO user (username, password, name, gender) VALUES ('${username}', '${hashedPassword}', '${name}', '${gender}');`;
        await db.run(postUserQuery);
        response.status(200);
        response.send("User created successfully");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("User already exists");
    }
  } catch (error) {
    console.log(`API1 error: ${error.message}`);
    process.exit(1);
  }
});

//API2
app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbResponse = await db.get(selectUserQuery);
    if (dbResponse === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      if (dbResponse.username === username) {
        const isValidPassword = await bcrypt.compare(
          password,
          dbResponse.password
        );
        if (isValidPassword) {
          const payload = {
            username: request.body.username,
            userId: dbResponse.user_id,
          };
          console.log(payload);
          const jwtToken = await jwt.sign(payload, "SECRET_KEY");
          response.send({ jwtToken });
        } else {
          response.status(400);
          response.send("Invalid password");
        }
      } else {
        response.status(400);
        response.send("Invalid user");
      }
    }
  } catch (error) {
    console.log(`error in API2: ${error.message}`);
    process.exit(1);
  }
});

//Authentication token
const authenticationToken = (request, response, next) => {
  let jwToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwToken = authHeader.split(" ")[1];
    if (jwToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwToken, "SECRET_KEY", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.userId = payload.userId;
          next();
        }
      });
    }
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

//API3
app.get(
  "/user/tweets/feed/",
  authenticationToken,
  async (request, response) => {
    try {
      const { userId } = request;
      const userFollowingFeedsQuery = `
      SELECT 
        user.username AS username,
        tweet.tweet AS tweet,
        tweet.date_time AS dateTime
      FROM 
        follower 
      INNER JOIN 
        tweet 
      ON 
        tweet.user_id = follower.following_user_id
      INNER JOIN
        user 
      ON
        follower.following_user_id = user.user_id
      WHERE
        follower.follower_user_id ='${userId}'
    GROUP BY tweet.tweet_id
      ORDER BY
        tweet.date_time DESC 
      LIMIT 
        4;`;
      const dbResponse = await db.all(userFollowingFeedsQuery);
      const formattedResponse = (obj) => {
        return {
          username: obj.username,
          tweet: obj.tweet,
          dateTime: obj.dateTime,
        };
      };
      response.send(dbResponse.map((eachFeed) => formattedResponse(eachFeed)));
    } catch (error) {
      console.log(`API3 error: ${error.message}`);
      process.exit(1);
    }
  }
);

//API4
app.get("/user/following/", authenticationToken, async (request, response) => {
  try {
    const { userId } = request;
    const followingUsernameQuery = `
        SELECT
            user.name AS username
        FROM
            user
        INNER JOIN
            follower
        ON
            follower.following_user_id = user.user_id
        WHERE
            follower.follower_user_id = '${userId}'
        `;
    const dbResponse = await db.all(followingUsernameQuery);
    const formattedResponse = (obj) => {
      return {
        name: obj.username,
      };
    };
    response.send(dbResponse.map((eachName) => formattedResponse(eachName)));
  } catch (error) {
    console.log(`API4 error: ${error.message}`);
    process.exit(1);
  }
});

//API5
app.get("/user/followers/", authenticationToken, async (request, response) => {
  try {
    const { userId } = request;
    const followersOfUsernameQuery = `
    SELECT
        user.name AS username
    FROM
        user
    INNER JOIN
        follower
    ON
        follower.follower_user_id = user.user_id
    WHERE
        follower.following_user_id = '${userId}'
    `;
    const dbResponse = await db.all(followersOfUsernameQuery);
    const formattedResponse = (obj) => {
      return {
        name: obj.username,
      };
    };
    const result = dbResponse.map((eachName) => formattedResponse(eachName));
    response.send(result);
  } catch (error) {
    console.log(`API4 error: ${error.message}`);
    process.exit(1);
  }
});

//API6
app.get("/tweets/:tweetId/", authenticationToken, async (request, response) => {
  try {
    const { userId } = request; //getting logged-in userID
    const { tweetId } = request.params; //getting tweetInfo
    const tweetIdQuery = `
    SELECT
        tweet,
        count(DISTINCT like_id) AS likes,
        count(DISTINCT reply_id) AS replies,
        tweet.date_time AS dateTime
    FROM
        tweet
    INNER JOIN
        reply
    ON 
        reply.tweet_id = tweet.tweet_id
    INNER JOIN
        like
    ON
        like.tweet_id = tweet.tweet_id
    WHERE
        tweet.user_id
        IN
            (
            SELECT
                following_user_id
            FROM
                follower
            WHERE
                follower_user_id = '${userId}'
            ) AND tweet.tweet_id = '${tweetId}';`;

    const dBResponseTweet = await db.get(tweetIdQuery);
    if (dBResponseTweet.tweet !== null) {
      response.send({
        tweet: dBResponseTweet.tweet,
        likes: dBResponseTweet.likes,
        replies: dBResponseTweet.replies,
        dateTime: dBResponseTweet.dateTime,
      });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  } catch (error) {
    console.log(`API6 error: ${error.message}`);
    process.exit(1);
  }
});

//API7
app.get(
  "/tweets/:tweetId/likes/",
  authenticationToken,
  async (request, response) => {
    try {
      const { tweetId } = request.params;
      const { userId } = request;
      const tweetLikesQuery = `
        SELECT
            username
        FROM
            tweet
        INNER JOIN
            like
        ON
            like.tweet_id = tweet.tweet_id
        INNER JOIN
            user
        ON
            user.user_id = like.user_id
        WHERE
            tweet.user_id
            IN
                (
                SELECT
                    following_user_id
                FROM
                    follower
                WHERE
                    follower_user_id = '${userId}'
                ) AND tweet.tweet_id = '${tweetId}';
        `;
      const dbResponse = await db.all(tweetLikesQuery);
      if (dbResponse[0] !== undefined) {
        const nameFromObj = (obj) => {
          return obj.username;
        };
        const usernamesArr = dbResponse.map((eachItem) =>
          nameFromObj(eachItem)
        );
        response.send({
          likes: usernamesArr,
        });
      } else {
        response.status(401);
        response.send("Invalid Request");
      }
    } catch (error) {
      console.log(`API7 error: ${error.message}`);
      process.exit(1);
    }
  }
);

//API8
app.get(
  "/tweets/:tweetId/replies/",
  authenticationToken,
  async (request, response) => {
    try {
      const { tweetId } = request.params;
      const { userId } = request;
      const repliesTweetQuery = `
      SELECT
            name,
            reply
        FROM
            tweet
        INNER JOIN
            reply
        ON
            reply.tweet_id = tweet.tweet_id
        INNER JOIN
            user
        ON
            user.user_id = reply.user_id
        WHERE
            tweet.user_id
            IN
                (
                SELECT
                    following_user_id
                FROM
                    follower
                WHERE
                    follower_user_id = '${userId}'
                ) AND tweet.tweet_id = '${tweetId}';
      `;
      const dbResponse = await db.all(repliesTweetQuery);
      if (dbResponse[0] !== undefined) {
        response.send({
          replies: dbResponse,
        });
      } else {
        response.status(401);
        response.send("Invalid Request");
      }
    } catch (error) {
      console.log(`API8 error: ${error.message}`);
      process.exit(1);
    }
  }
);

//API9
app.get("/user/tweets/", authenticationToken, async (request, response) => {
  try {
    const { userId } = request;
    const userTweetsQuery = `
        SELECT
            tweet.tweet,
            COUNT(DISTINCT like_id) AS likes,
            COUNT(DISTINCT reply_id) AS replies,
            tweet.date_time AS dateTime
        FROM 
            tweet
        INNER JOIN
            like
        ON
            like.tweet_id = tweet.tweet_id
        INNER JOIN
            reply
        ON
            reply.tweet_id = tweet.tweet_id
        WHERE
            tweet.user_id= '${userId}'
        GROUP BY
            tweet.tweet_id;
        `;
    const dbResponse = await db.all(userTweetsQuery);
    response.send(dbResponse);
  } catch (error) {
    console.log(`API9 error: ${error.message}`);
    process.exit(1);
  }
});

//API-10
app.post("/user/tweets/", authenticationToken, async (request, response) => {
  try {
    const { userId } = request;
    const { tweet } = request.body;
    const dateTime = new Date();
    // console.log(tweet);
    const postTweetQuery = `
    INSERT INTO
        tweet (tweet, user_id, date_time)
    VALUES
        ('${tweet}', '${userId}', '${dateTime}');`;
    await db.run(postTweetQuery);
    response.send("Created a Tweet");
  } catch (error) {
    console.log(`API-10 error : ${error.message}`);
    process.exit(1);
  }
});

//API-11
app.delete(
  "/tweets/:tweetId/",
  authenticationToken,
  async (request, response) => {
    try {
      const { tweetId } = request.params;
      const { userId } = request;
      const getUserOfTweetQuery = `
        SELECT
            user_id
        FROM
            tweet
        WHERE
            tweet_id = '${tweetId}';`;
      const user = await db.get(getUserOfTweetQuery);
      if (userId === user.user_id) {
        const deleteQuery = `
            DELETE FROM
                tweet
            WHERE
                tweet_id = '${tweetId}' AND user_id='${userId}';`;
        await db.run(deleteQuery);
        response.send("Tweet Removed");
      } else {
        response.status(401);
        response.send("Invalid Request");
      }
    } catch (error) {
      console.log(`API 11 error : ${error.message}`);
      process.exit(1);
    }
  }
);

module.exports = app;
