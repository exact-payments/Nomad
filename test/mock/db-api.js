const sinon = require('sinon');


const dbApi = {
  up  : sinon.stub().callsArgWith(1, null),
  down: sinon.stub().callsArgWith(1, null),
};


module.exports = dbApi;
