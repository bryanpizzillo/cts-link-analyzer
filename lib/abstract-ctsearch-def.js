'use strict';

class AbstractCTSearchDef {

  //get type  
  constructor() {

  }

  _getPaddedCDRID(id) {
    let tmpstr = `0000000000${id}`;
    tmpstr = tmpstr.substr(tmpstr.length - 10);
    tmpstr = "CDR" + tmpstr;
    return tmpstr;
  }

}

module.exports = AbstractCTSearchDef;