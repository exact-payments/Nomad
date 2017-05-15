

class MigrationError extends Error {

  constructor(type, message) {
    super(message);
    this.name    = this.constructor.name;
    this.type    = type;
    this.message = message;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}


module.exports = MigrationError;
