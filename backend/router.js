
const express = require('express');
const router = express.Router();
const Person = require('./models/person');
const Location = require('./models/location');
const RelationType = require('./models/relationType');

/**
 * Auth routes
 */
const signUpRoute = require('./routes/auth/sign-up');
const loginRoute = require('./routes/auth/login');

router.use(signUpRoute);
router.use(loginRoute);

/**
 * Entity routes
 */
const entityFactory = require('./routes/entityFactory');

router.use(entityFactory('persons', Person));
router.use(entityFactory('locations', Location));
router.use(entityFactory('relationTypes', RelationType));

/**
 * Changes routes
 */
const changesFactory = require('./routes/changesFactory');

router.use(changesFactory('persons', Person));
router.use(changesFactory('locations', Location));
router.use(changesFactory('relationTypes', RelationType));

module.exports = router;
