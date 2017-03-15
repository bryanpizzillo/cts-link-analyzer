'use strict';
const _         = require('lodash');

const AbstractCTSearchDef = require('./abstract-ctsearch-def');

class SavedSearchDef extends AbstractCTSearchDef {

  constructor(searchDefSvc, protocolSearchID, done) {
    super();
    
    searchDefSvc.getProtocolSearchDef(protocolSearchID, (err, res) => {
      if (err) {
        return done(err);
      }

      //Copy items from res to this.
      _.extend(this, res);

      done(null);
    });

  }
}

module.exports = SavedSearchDef;