const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/task');
const {
  userOne,
  userTwo,
  taskOne,
  taskThree,
  setupDatabase
} = require('./fixtures/db');

jest.mock('../src/emails/account'); // this happens automatically with automocking

const email = require('../src/emails/account');

email.sendWelcomeMail.mockImplementation(() => true);
email.sendCancellationMail.mockImplementation(() => true);

beforeEach(setupDatabase);

test('Should create task for user', async () => {
  const description = 'From my test';
  const response = await request(app)
    .post('/tasks')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      description
    })
    .expect(201);

  const task = await Task.findById(response.body._id);

  expect(task).not.toBeNull();
  expect(task.completed).toBe(false);
  expect(task.description).toBe(description);
})


test('Should get task for a user', async () => {
  const response = await request(app)
    .get('/tasks')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  expect(response.body.length).toBe(2);
})

test('Should not delete other users task', async () => {
  await request(app)
    .delete(`/tasks/${ taskOne._id }`)
    .set('Authorization', `Bearer ${ userTwo.tokens[0].token }`)
    .send()
    .expect(404)

  const task = await Task.findById(taskOne._id);
  expect(task).not.toBeNull(); //check that the task is still there
})



test('Should not create task with invalid description/completed', async () => {
  await request(app)
    .post(`/tasks`)
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      description: '',
      completed: 'no' //only true or false is needed
    })
    .expect(400)

})

test('Should not update task with invalid description/completed', async () => {
  await request(app)
    .patch(`/tasks/:${ taskOne._id }`)
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      description: '',
      completed: 'no' //only true or false is needed
    })
    .expect(400)

})

test('Should delete user task', async () => {
  const taskOneId = taskOne._id;
  await request(app)
    .delete(`/tasks/${ taskOneId }`)
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  //Assertion to see if truly deleted from db
  const task = await Task.findById({_id: taskOneId})
  expect(task).toBeNull();
})

test('Should not delete task if unauthenticated', async () => {
  const taskOneId = taskOne._id;
  await request(app)
    .delete(`/tasks/${ taskOneId }`)
    .send()
    .expect(401);

  //Assertion to see if task is still in db
  const task = await Task.findById({_id: taskOneId})
  expect(task).not.toBeNull();
})

test('Should not update other users task', async () => {
  const taskThreeId = taskThree._id;
  await request(app)
    .patch(`/tasks/${ taskThreeId }`)
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      description: 'Updated description',
      completed: false //only true or false is needed
    })
    .expect(404)

  //Assertions that the task was not changed
  const fetchedTaskThree = await Task.findById(taskThreeId);

  expect(fetchedTaskThree).toMatchObject(taskThree);

})

test('Should fetch user task by id', async () => {
  const taskOneId = taskOne._id;

  const response = await request(app)
    .get(`/tasks/${ taskOneId }`)
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  //Assertion that fetched Object match
  let {_id, owner, ...theRest} = taskOne;
  _id = _id.toString();
  owner = owner.toString();

  expect(response.body).toMatchObject({_id, owner, ...theRest});
})


test('Should not fetch user task by id if unauthenticated', async () => {
  const taskOneId = taskOne._id;

  await request(app)
    .get(`/tasks/${ taskOneId }`)
    .send()
    .expect(401);
})


test('Should not fetch other users task by id', async () => {
  await request(app)
    .get(`/tasks/${ taskThree._id }`)
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(404);
})

test('Should fetch only completed tasks', async () => {
  const response = await request(app)
    .get('/tasks?completed=true')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  isAllTrue = response.body.every(({completed}) => completed === true)

  expect(isAllTrue).toBe(true)
})

test('Should fetch only incomplete tasks', async () => {
  const response = await request(app)
    .get('/tasks?completed=false')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  isAllFalse = response.body.every(({completed}) => completed === false)

  expect(isAllFalse).toBe(true)
})

test('Should sort tasks by description/completed/createdAt/updatedAt', async () => {

  //Assertion that sorting by description works
  let response = await request(app)
    .get('/tasks?sortBy=description:desc')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  let task = response.body;
  expect(task[0].description > task[1].description).toBe(true);

  //Assertion that sorting by completed works
  response = await request(app)
    .get('/tasks?sortBy=completed:desc')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  task = response.body;
  expect(task[0].completed > task[1].completed).toBe(true);

  //Assertion that sorting by createdAt works
  response = await request(app)
    .get('/tasks?sortBy=createdAt:desc')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  task = response.body;
  expect(new Date(task[0].createdAt) > new Date(task[1].createdAt)).toBe(true);

  //Assertion that sorting by updatedAt works
  response = await request(app)
    .get('/tasks?sortBy=updatedAt:desc')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  task = response.body;
  expect(new Date(task[0].updatedAt) > new Date(task[1].updatedAt)).toBe(true);
})