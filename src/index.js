const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers

  const usernameExists = users.find((user) => {return user.username === username})

  if (usernameExists) {
    request.user = usernameExists

    return next()
  } else if (!usernameExists) {
    return response.status(404).json({ error: "Username not Found" })
  }
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request

  if (user.pro === true || user.todos.length < 10) {
    return next()
  } else {
    return response.status(403).json({ error: "Limit reached" })
  }
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers
  const id = request.params.id

  const user = users.find((client) => {return client.username === username})

  if (user) {
    const validatedId = validate(id, 4)
    console.log(validatedId)
    if (validatedId) {
      const todo = user.todos.find((task) => {return task.id === id})
      if (todo) {
        request.todo = todo
        request.user = user

        return next()
      } else {
        return response.status(404).json({ error: "Todo not found" })
      }
    } else {
      return response.status(400).json({ error: "Id is not Valid" })
    }
  } else {
    return response.status(404).json({ error: "Username not found" })
  }
}

function findUserById(request, response, next) {
  const id = request.params.id
  
  const user = users.find((client) => {return client.id === id})

  if (user) {
    request.user = user

    return next()
  } else if (!user) {
    return response.status(404).json({ error: "User not found" })
  }
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};