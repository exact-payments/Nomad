const { VM } = require('vm2');


const evalMigrationSrc = (nomadFile, src) => {

  const migrationModule = {
    exports: {},
  };
  const migrationEnv = {
    module : migrationModule,
    exports: migrationModule.exports,
  };

  const migrationVM = new VM({
    console: 'redirect',
    sandbox: Object.assign(migrationEnv, nomadFile.context),
    require: false,
  });

  migrationVM.run(src);

  return migrationModule.exports || {};
};


module.exports = evalMigrationSrc;
