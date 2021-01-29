const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const bcrypt = require('bcryptjs');

const {
  userOneId,
  userOne,
  setupDatabase
} = require('./fixtures/db');

jest.mock('../src/emails/account'); // this happens automatically with automocking

const email = require('../src/emails/account');

email.sendWelcomeMail.mockImplementation(() => true);
email.sendCancellationMail.mockImplementation(() => true);

beforeEach(setupDatabase);

// afterEach(() => {
//   console.log('After each')
// });

test('Should sign up a new user', async () => {

  const newUser = {
    name: 'Kelvin',
    email: 'kelvinjune2@gmail.com',
    password: 'kelvin777!'
  };

  const response = await request(app)
    .post('/users')
    .send(newUser).expect(201);

  //Assert that the database was changed correctly
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  const {password, ...theRest} = newUser;

  //Assertions about the response
  expect(response.body).toMatchObject({
    user: theRest,
    token: user.tokens[0].token
  })

  //Assertions that the password has been hashed
  expect(user.password).not.toBe(password);
})

test('Should login existing user', async () => {
  const response = await request(app)
    .post('/users/login')
    .send({
      email: userOne.email,
      password: userOne.password
    }).expect(200);

  //Validate new token is saved and matches 
  const user = await User.findById(userOneId);

  expect(response.body.token).toBe(user.tokens[1].token);
})

test('Should not login non existent user', async () => {
  await request(app)
    .post('/users/login')
    .send({
      email: userOne.email,
      password: 'badpassword'
    }).expect(400);
})

test('Should get profile for user', async () => {
  await request(app)
    .get('/users/me')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);
})

test('Should not get profile for unauthenticated user', async () => {
  await request(app)
    .get('/users/me')
    .send()
    .expect(401);
})

test('Should delete account for user', async () => {
  await request(app)
    .delete('/users/me')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send()
    .expect(200);

  //Validate that the user is actually deleted

  const user = await User.findById(userOneId);
  expect(user).toBeNull();
})

test('Should not delete account for unauthenticated user', async () => {
  await request(app)
    .delete('/users/me')
    .send()
    .expect(401);
})

test('Should upload avatar image', async () => {
  await request(app)
    .post('/users/me/avatar')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .attach('avatar', 'tests/fixtures/profile-pic.jpg') //path is from root of directory
    .expect(200);

  const user = await User.findById(userOneId);
  expect(user.avatar).toEqual(expect.any(Buffer));

})

test('Should update valid user field', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      name: 'Kelvin'
    })
    .expect(200);

  const user = await User.findById(userOneId);
  expect(user.name).toEqual('Kelvin');
})

test('Should not update invalid user fields', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      location: 'New York'
    })
    .expect(400);
})



test('Should not signup user with invalid name/email/password', async () => {
  const response = await request(app)
    .post('/users')
    .send({
      name: 'Bad Name',
      email: 'invalid_email',
      password: 'password'
    })
    .expect(400);

  expect(response.body.user).toBeUndefined();
})

test('Should not update user if unauthenticated', async () => {
  await request(app)
    .patch('/users/me')
    .send({
      name: 'Bad Name',
      email: 'invalid_email',
      password: 'password'
    })
    .expect(401)
})

test('Should not update user with invalid name/email/password', async () => {
  await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${ userOne.tokens[0].token }`)
    .send({
      name: 2222,
      email: 'invalid_email',
      password: 'password'
    })
    .expect(400);

  //Assertions that data was not change
  const user = await User.findById(userOneId);

  expect(user.name).toEqual(userOne.name);
  expect(user.email).toEqual(userOne.email);

  //Assertions that the password is still valid
  const isValidPassword = await bcrypt.compare(userOne.password, user.password)
  expect(isValidPassword).toBe(true)

})

test('Should not delete user if unauthenticated', async () => {
  await request(app)
    .delete('/users/me')
    .send()
    .expect(401)
})