const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const app = express();

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
let statusArr = ["TO DO", "IN PROGRESS", "DONE"];
let priorityArr = ["HIGH", "MEDIUM", "LOW"];
let categoryArr = ["WORK", "HOME", "LEARNING"];

//middlewares
app.use(express.json());

//API for server initialization and DB
const initializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Hosted at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Hosting Server and Db API error : ${error.message}`);
    process.exit(1);
  }
};
initializeServerAndDb();

//API1
const hasStatusAndPriority = (obj) => {
  return obj.status !== undefined && obj.priority !== undefined;
};

const hasStatusAndCategory = (obj) => {
  return obj.status !== undefined && obj.category !== undefined;
};

const hasPriorityAndCategory = (obj) => {
  return obj.priority !== undefined && obj.category !== undefined;
};

const hasPriority = (obj) => {
  return obj.priority !== undefined;
};

const hasStatus = (obj) => {
  return obj.status !== undefined;
};

const hasCategory = (obj) => {
  return obj.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  try {
    const { category, status, priority, search_q = "" } = request.query;
    let getTodoQuery = "";

    const formattedResponse = (eachTodo) => {
      return {
        id: eachTodo.id,
        todo: eachTodo.todo,
        priority: eachTodo.priority,
        status: eachTodo.status,
        category: eachTodo.category,
        dueDate: eachTodo.due_date,
      };
    };

    const dbOperation = async (query) => {
      const dbResponse = await db.all(query);
      response.send(dbResponse.map((eachTodo) => formattedResponse(eachTodo)));
    };

    switch (true) {
      case hasStatusAndPriority(request.query):
        if (statusArr.includes(status)) {
          if (priorityArr.includes(priority)) {
            getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority = '${priority}' AND status='${status}';`;
            dbOperation(getTodoQuery);
          } else {
            response.status(400);
            response.send("Invalid Todo Priority");
          }
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        break;
      case hasStatusAndCategory(request.query):
        if (statusArr.includes(status)) {
          if (categoryArr.includes(category)) {
            getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category = '${category}' AND status='${status}';`;
            dbOperation(getTodoQuery);
          } else {
            response.status(400);
            response.send("Invalid Todo Category");
          }
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        break;
      case hasPriorityAndCategory(request.query):
        if (priorityArr.includes(priority)) {
          if (categoryArr.includes(category)) {
            getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category ='${category}' AND priority = '${priority}';`;
            dbOperation(getTodoQuery);
          } else {
            response.status(400);
            response.send("Invalid Todo Category");
          }
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case hasPriority(request.query):
        if (priorityArr.includes(priority)) {
          getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority ='${priority}';`;
          dbOperation(getTodoQuery);
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case hasStatus(request.query):
        if (statusArr.includes(status)) {
          getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status= '${status}';`;
          dbOperation(getTodoQuery);
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        break;
      case hasCategory(request.query):
        if (categoryArr.includes(category)) {
          getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category = '${category}';`;
          dbOperation(getTodoQuery);
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
        break;
      default:
        getTodoQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
        dbOperation(getTodoQuery);
        break;
    }
  } catch (error) {
    console.log(`API 1 error: ${error.message}`);
    process.exit(1);
  }
});

//API2
app.get("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const todoByIdQuery = `SELECT * FROM todo WHERE id ='${todoId}';`;
    const dbResponse = await db.get(todoByIdQuery);
    response.send({
      id: dbResponse.id,
      todo: dbResponse.todo,
      priority: dbResponse.priority,
      status: dbResponse.status,
      category: dbResponse.category,
      dueDate: dbResponse.due_date,
    });
  } catch (error) {
    console.log(`API-2 error: ${error.message}`);
    process.exit(1);
  }
});

//API3
app.get("/agenda/", async (request, response) => {
  try {
    let { date } = request.query;
    let getAgendaQuery = "";
    if (date !== undefined) {
      if (isValid(new Date(date))) {
        date = format(new Date(date), "yyyy-MM-dd");
        getAgendaQuery = `SELECT* FROM todo WHERE due_date = '${date}';`;
        const dbResponse = await db.all(getAgendaQuery);
        if (dbResponse[0] !== undefined) {
          const formattedResponse = (eachTodo) => {
            return {
              id: eachTodo.id,
              todo: eachTodo.todo,
              priority: eachTodo.priority,
              status: eachTodo.status,
              category: eachTodo.category,
              dueDate: eachTodo.due_date,
            };
          };
          response.send(
            dbResponse.map((eachTodo) => formattedResponse(eachTodo))
          );
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    } else {
      getAgendaQuery = `SELECT* FROM todo;`;
      const dbResponse = await db.all(getAgendaQuery);
      if (dbResponse[0] !== undefined) {
        const formattedResponse = (eachTodo) => {
          return {
            id: eachTodo.id,
            todo: eachTodo.todo,
            priority: eachTodo.priority,
            status: eachTodo.status,
            category: eachTodo.category,
            dueDate: eachTodo.due_date,
          };
        };
        response.send(
          dbResponse.map((eachTodo) => formattedResponse(eachTodo))
        );
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    }
  } catch (error) {
    console.log(`API3 error: ${error.message}`);
    process.exit(1);
  }
});

//API4
app.post("/todos/", async (request, response) => {
  try {
    let { id, todo, priority, status, category, dueDate } = request.body;
    if (priorityArr.includes(priority)) {
      if (statusArr.includes(status)) {
        if (categoryArr.includes(category)) {
          if (dueDate !== undefined) {
            if (isValid(new Date(dueDate))) {
              dueDate = format(new Date(dueDate), "yyyy-MM-dd");
              const postTodoQuery = `INSERT INTO todo (id, todo, priority, status, category, due_date) VALUES ('${id}', '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
              await db.run(postTodoQuery);
              response.send("Todo Successfully Added");
            } else {
              response.status(400);
              response.send("Invalid Due Date");
            }
          } else {
            response.status(400);
            response.send("Invalid Due Date");
          }
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } catch (error) {
    console.log(`error in API4 : ${error.message}`);
    process.exit(1);
  }
});

//API5
app.put("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    let operation = "";
    let { status, priority, todo, category, dueDate } = request.body;
    let updateTodoQuery = "";
    switch (true) {
      case status !== undefined:
        if (statusArr.includes(status)) {
          updateTodoQuery = `UPDATE todo SET status = '${status}';`;
          operation = "Status";
          await db.run(updateTodoQuery);
          response.send(`${operation} Updated`);
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        break;
      case priority !== undefined:
        if (priorityArr.includes(priority)) {
          updateTodoQuery = `UPDATE todo SET priority = '${priority}';`;
          operation = "Priority";
          await db.run(updateTodoQuery);
          response.send(`${operation} Updated`);
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case todo !== undefined:
        updateTodoQuery = `UPDATE todo SET todo = '${todo}';`;
        operation = "Todo";
        await db.run(updateTodoQuery);
        response.send(`${operation} Updated`);
        break;
      case category !== undefined:
        if (categoryArr.includes(category)) {
          updateTodoQuery = `UPDATE todo SET category = '${category}';`;
          operation = "Category";
          await db.run(updateTodoQuery);
          response.send(`${operation} Updated`);
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
        break;
      case dueDate !== undefined:
        if (isValid(new Date(dueDate))) {
          dueDate = format(new Date(dueDate), "yyyy-MM-dd");
          updateTodoQuery = `UPDATE todo SET due_date = '${dueDate}';`;
          operation = "Due Date";
          await db.run(updateTodoQuery);
          response.send(`${operation} Updated`);
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
        break;
    }
  } catch (error) {
    console.log(`API5 error : ${error.message}`);
    process.exit(1);
  }
});

//API6
app.delete("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const deleteQuery = `DELETE FROM todo WHERE id = '${todoId}';`;
    await db.run(deleteQuery);
    response.send("Todo Deleted");
  } catch (error) {
    console.log(`API6 error: ${error.message}`);
    process.exit(1);
  }
});

module.exports = app;
