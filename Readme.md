

# Nomad

Nomad is a migration tool and framework for those of us who think migrations
are an important part of application development. Nomad works with any data
store or database because it doesn't have any opinions about how to interact
with the data. The task of connecting to the database and providing an interface
to migrations is left to the logic in your NomadFile. By doing this Nomad can
offer powerful tools and features without restricting you to a given database
or migration API.


## Getting Started

To get started with Nomad you will need to install it on your system. Nomad is
installed using NPM and must be installed globally.

```
$ npm install nomad-cli -g
```

Once you have nomad installed you will need to navigate to you project
directory and generate a NomadFile for your project.

![example of creating a NomadFile](http://i.imgur.com/nXJDtSr.png)

Note that if your using MongoDB we provide a more complete NomadFile with most
of the work done for you. You can use this template instead by adding `mongodb`
to the end of the init command. Currently only MongoDB is supported, but we plan
on adding more templates soon.

![example of creating a NomadFile for Mongo](http://i.imgur.com/QpSY1zr.png)

Once you've created a NomadFile.js you will need to populate the file with the
logic needed to connect to your database, save and fetch migrations.

See the [NomadFile API](#nomadfile-api) docs below for more detailed information
on implementing the required logic.

Here is an example NomadFile for MongoDB.

```javascript
var MongoClient = require('mongodb').MongoClient;


// Remember to set these values to match your application's database
var DATABASE_URL              = 'mongodb://localhost/my-app';
var MIGRATION_COLLECTION_NAME = 'migrations';


module.exports = function(nomad) {

  nomad.driver({
    connect: function(cb) {
      var _this = this;

      MongoClient.connect(DATABASE_URL, function(err, db) {
        if (err) { return cb(err); }
        _this.db = db;
        cb(null, db);
      });
    },

    disconnect: function(cb) {
      this.db.close(cb);
    },

    createMigration: function(migration, cb) {
      this.db.collection(MIGRATION_COLLECTION_NAME).insertOne(migration, cb);
    },

    updateMigration: function(filename, migration, cb) {
      this.db.collection(MIGRATION_COLLECTION_NAME).updateOne({
        filename: filename
      }, {
        $set: migration
      }, cb);
    },

    getMigrations: function(cb) {
      this.db.collection(MIGRATION_COLLECTION_NAME).find().toArray(cb);
    }
  });
};
```

Note: If you ever need help with the cli simply add a `-h` or `--help` to the
end of a nomad command.

![Using the help flag](http://i.imgur.com/18dsQgT.png)


## Creating a Migration

To create a migration use the create command.

```
$ nomad create
```

The create command will ask you questions then create a new migration file for
you in your `/migrations` directory. For this point all you need to do is
populate the migration with the correct logic, set `isIgnored` to `false`, and
`isReversible` accordingly.

![example of creating a migration](http://i.imgur.com/ZT6Kazj.gif)


# Nomad API

Nomad files are expected to export a function that will configure Nomad in so
that it can preform migrations against you database. This `setup` function will
be passed a `Nomad` instance. With it it can register a Nomad driver, and set
additional values for the global scope of the migrations.


## Nomad#context

```
Nomad#context Object
```

This object becomes the global scope of all migrations that run within Nomad.
For security reasons Nomad migrations are executed within a VM context separate
from Nomad itself. Adding properties to this object will expose them within the
migration context. This is useful if you wish to use support libraries such as
async in your migrations.

__NomadFile.js__

```javascript
...
nomad.context.async = require('async');
...
```

__20150818-113521-00.someMigration.js__

```javascript
...
exports.up = function(db, cb) {
  async.waterfall(...)
};
...
```


## Nomad#driver

```
Nomad#driver(nomad Nomad)
```

The driver method accepts a Nomad driver object. This object must implement the
driver API. In order for Nomad to work this method must be called within your
NomadFile. It also must be passed a valid driver object. See the following
section for the requirements of implementing a driver.


# Nomad Driver API

The following section describes the NomadFile Driver API. This will be helpful
when implementing your NomadFile.


## Driver#connect

```
driver.connect(cb, cb(err Error, db Object))
```

Connect must do any pre migration work such as setting up a database connection.
It also must pass a `db` object to its callback. This `db` object will be the
API with which migrations will interact with the database. See [up](#exports.up)
and [down](#exports.down) from the [Migration API](#migration-api) for more
context on how the `db` object is meant to be used.

```javascript
  ...
  connect: function(cb) {
    var _this = this;

    MongoClient.connect(DATABASE_URL, function(err, db) {
      if (err) { return cb(err); }
      _this.db = db;
      cb(null, db);
    });
  },
  ...
});
```


## exports.disconnect

```
exports.disconnect(cb, cb(err Error))
```

Disconnect must do any teardown required before the nomad process exits. This
could include closing a database connection or any other post migration tasks.

```javascript
  ...
  disconnect: function(cb) {
    this.db.close(cb);
  },
  ...
});
```


## exports.createMigration

```
exports.createMigration(migration Object, cb(err Error))
```

Create migration is used by nomad to save migrations to the database. This is
required so that Nomad can keep track of what migrations have been applied and
when.

```javascript
  ...
  createMigration: function(migration, cb) {
    this.db.collection(MIGRATION_COLLECTION_NAME).insertOne(migration, cb);
  },
  ...
});
```


## exports.updateMigration

```
exports.updateMigration(filename String, migration Object, cb(err Error))
```

Update migration is used by nomad to update migrations that have been modified
on disk and thus need to be updated within the database.

```javascript
  ...
  updateMigration: function(filename, migration, cb) {
    this.db.collection(MIGRATION_COLLECTION_NAME).updateOne({
      filename: filename
    }, {
      $set: migration
    }, cb);
  },
  ...
});
```


## exports.getMigrations

```
exports.getMigrations(cb(err Error))
```

Get migrations is used by Nomad to collect migrations so it can keep track of
state and sync migrations to and from disk.

```javascript
  ...
  getMigrations: function(cb) {
    this.db.collection(MIGRATION_COLLECTION_NAME).find().toArray(cb);
  }
  ...
});
```


# Migration API

The following section describes the migration API each migration file must use.
This section will be most helpful to those trying to implement migrations.

Note that migrations run within a restricted VM context and thus have their own
global object. Calling `require` is also not allowed. This has been done for
security reasons. If you need to add something like a library such as async
to you you migrations, this can be achieved by adding it to the context object
in the NomadFile.

Here is an example migration. Note that is migration has isIgnored set to true
to prevent you from copy and pasting this example willy nilly.

__20150818-113521-00.addFirstAndLastToUser.js__

```javascript
exports.name         = 'addFirstAndLastToUser';
exports.description  = 'Adds first and last name fields to the user model';
exports.isReversable = null;
exports.isIgnored    = true;

exports.up = function(db, done) {
  var usersCollection = db.collection('users');
  usersCollection.find().toArray(function(err, users) {
    if (err) { return done(err); }

    async.each(users, function(user, cb) {
      var names     = user.name.split(' ');
      var lastName  = names.pop();
      var firstName = names.join(' ');

      usersCollection.updateOne({
        _id: user._id
      }, {
        $set: {
          firstName: firstName,
          lastName : lastName
        },
        $unset: {
          name: 1
        }
      }, cb);
    }, done);
  });
};

exports.down = function(db, done) {
  var usersCollection = db.collection('users');
  usersCollection.find().toArray(function(err, users) {
    if (err) { return done(err); }

    async.each(users, function(user, cb) {
      usersCollection.updateOne({
        _id: user._id
      }, {
        $set: {
          name: user.firstName + ' ' + user.lastName
        },
        $unset: {
          firstName: 1,
          lastName : 1
        }
      }, cb);
    }, done);
  });
};
```


## exports.name

```
exports.name String
```

This is the name of your migration. The value will be set by the create command.
Changing this string is not recommended.


## exports.description

```
exports.description String
```

This is the description of your migration. The value will be set by the create
command. Changing this string is not recommended.


## exports.isIgnored

```
exports.isIgnored Boolean
```

`isIgnored` is set to `true` by default. This is so Nomad does not commit
incomplete or in progress migrations to the database accidentally. In order to
use your migration set isIgnored to `true` once complete.


## exports.isReversible

```
exports.isReversible Boolean
```

`isReversible` is set to `null` by default. This MUST be set to either `true` or
`false` or Nomad will refuse to run your migration. `isReversible` should
reflect whether or not your migration is destructive and if it can be reversed.
If set to `false`, the down command will not allow you to rollback to, or past
this migration. We recommended that you always write migrations that are
reversible and non destructive. That said we realize this isn't always possible.


## exports.up

```
exports.up(db Object, cb(err Error))
```

Up is executed by Nomad when it's time to apply your migration. This method must
implement the logic to preform your migration. It's recommended that you try and
write your migrations in a non destructive way if you can.


## exports.down

```
exports.down(db Object, cb(err Error))
```

As you can probably imagine this is where you will preform your rollback. We can
not stress enough, you should always try to implement rollback logic for your
migrations. Not doing so can be a very painful experience.
