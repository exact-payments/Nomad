const NomadFile        = require('./nomad-file');
const evalMigrationSrc = require('./eval-migration-src');


class Migration {

  constructor(nomadFile, record) {
    this._nomadFile = nomadFile;

    this.filename     = record.filename;
    this.src          = record.src        || '';
    this.appliedSrc   = record.appliedSrc || '';
    this.failedAt     = record.failedAt   || null;
    this.errorStack   = record.errorStack || null;
    this.appliedAt    = record.appliedAt  || null;
    this.reversedAt   = record.reversedAt || null;

    this.name         = null;
    this.description  = null;
    this.isReversible = null;
    this.isIgnored    = null;
    this.up           = null;
    this.down         = null;

    this.currentMigrationModule = null;
    this.appliedMigrationModule = null;

    if (this._nomadFile && this.src) {
      try {
        this.currentMigrationModule = evalMigrationSrc(this._nomadFile, this.src);
      } catch (err) {
        throw new Error(
          `failed to evaluate current migration source for migration ${this.filename}: ${err.stack}`
        );
      }
      this.name         = this.currentMigrationModule.name;
      this.description  = this.currentMigrationModule.description;
      this.isReversible = this.currentMigrationModule.isReversible;
      this.isIgnored    = this.currentMigrationModule.isIgnored;
      this.up           = this.currentMigrationModule.up;
      this.down         = this.currentMigrationModule.down;
    }

    if (this._nomadFile && this.appliedSrc) {
      try {
        this.appliedMigrationModule = evalMigrationSrc(this._nomadFile, this.appliedSrc);
      } catch (err) {
        throw new Error(
          `failed to evaluate current migration source for migration ${this.filename}: ${err.stack}`
        );
      }
      this.name         = this.appliedMigrationModule.name;
      this.description  = this.appliedMigrationModule.description;
      this.isReversible = this.appliedMigrationModule.isReversible;
      this.down         = this.appliedMigrationModule.down;
    }
  }

  validate() {
    if (!(this._nomadFile instanceof NomadFile)) {
      throw new Error('opts.nomadFile be a NomadFile instance');
    }
    if (typeof this.src !== 'string') {
      throw new Error('opts.src must be a string');
    }
    if (typeof this.appliedSrc !== 'string') {
      throw new Error('opts.appliedSrc must be a string');
    }
    if (typeof this.filename !== 'string') {
      throw new Error('opts.filename must be a string');
    }
    if (typeof this.name !== 'string') {
      throw new Error('opts.src or opts.appliedSrc when evaled must export name as a string');
    }
    if (typeof this.description !== 'string') {
      throw new Error(
        'opts.src or opts.appliedSrc when evaled must export description as a string'
      );
    }
    if (typeof this.isReversible !== 'boolean') {
      throw new Error(
        'opts.src or opts.appliedSrc when evaled must export isReversible as a boolean'
      );
    }
    if (this.errorStack && typeof this.errorStack !== 'string') {
      throw new Error('opts.errorStack must be a string');
    }
    if (this.currentMigrationModule && typeof this.currentMigrationModule.up !== 'function') {
      throw new Error('opts.src when evaled must export up as a function');
    }
    if (this.currentMigrationModule && typeof this.currentMigrationModule.down !== 'function') {
      throw new Error('opts.src when evaled must export down as a function');
    }
    if (this.appliedMigrationModule && typeof this.appliedMigrationModule.up !== 'function') {
      throw new Error('opts.appliedSrc when evaled must export up as a function');
    }
    if (this.appliedMigrationModule && typeof this.appliedMigrationModule.down !== 'function') {
      throw new Error('opts.appliedSrc when evaled must export down as a function');
    }
    if (this.appliedMigrationModule && !(this.appliedAt instanceof Date)) {
      throw new Error('opts.appliedAt must be a instanceof Date');
    }
    if (this.reversedAt && !(this.reversedAt instanceof Date)) {
      throw new Error('opts.reversedAt must be a instanceof Date');
    }
    if (this.failedAt && !(this.failedAt instanceof Date)) {
      throw new Error('opts.failedAt must be a instanceof Date');
    }
  }

  toRecord() {
    return {
      filename  : this.filename,
      src       : this.src,
      appliedSrc: this.appliedSrc,
      failedAt  : this.failedAt,
      errorStack: this.errorStack,
      appliedAt : this.appliedAt,
      reversedAt: this.reversedAt,
    };
  }
}


module.exports = Migration;
