

const migrationRecords = [
  {
    src: `
exports.name         = 'migration-b';
exports.description  = 'Migration b';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('updated-b', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('updated-b', cb);
};
`,
    appliedSrc: `
exports.name         = 'migration-b';
exports.description  = 'Migration modified since it was applied';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('b', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('b', cb);
};
`,
    filename : '00000000-000000-01.b.js',
    appliedAt: new Date(),
  }, {
    src: `
exports.name         = 'migration-c';
exports.description  = 'Migration c';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('c', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('c', cb);
};
`,
    filename: '00000000-000000-02.c.js',
  }, {
    appliedSrc: `
exports.name         = 'migration-x';
exports.description  = 'Migration deleted since it was applied';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('rem-c', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('rem-c', cb);
};
`,
    filename : '00000000-000000-03.x.js',
    appliedAt: new Date(),
  }, {
    src: `
exports.name         = 'migration-a';
exports.description  = 'Migration a';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('a', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('a', cb);
};
`,
    appliedSrc: `
exports.name         = 'migration-a';
exports.description  = 'Migration a';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('a', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('a', cb);
};
`,
    filename : '00000000-000000-00.a.js',
    appliedAt: new Date(),
  }, {
    src: `
exports.name         = 'migration-d';
exports.description  = 'Migration d';
exports.isReversible = true;
exports.up           = (dbApi, cb) => {
  dbApi.up('d', cb);
};
exports.down = (dbApi, cb) => {
  dbApi.down('d', cb);
};
`,
    filename: '00000000-000000-03.d.js',
  },
];


module.exports = migrationRecords;
