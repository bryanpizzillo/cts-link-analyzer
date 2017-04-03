'use strict';

const _                 = require('lodash');

const CTLinkSearchDef       = require('./ctlink-search-def');
const SavedSearchDef        = require('./saved-search-def');


/**
 * Class wrapping a link db.
 * 
 * @class LinkDB
 */
class LinkDB {

  /**
   * Creates an instance of an empty LinkDB.
   * 
   * 
   * @memberOf LinkDB
   */
  constructor() {
    this.linkdb = {};
  }


  getLink(url) {
    if (!url || url == "") {
      throw new Error("Empty URL");
    }

    console.log(url);

    let link = this.linkdb[url.toLowerCase()];

    return link;
  }

  /**
   * Internal method to add a link to the DB.
   * 
   * @param {any} url
   * @param {any} linkinfo
   * 
   * @memberOf LinkDB
   */
  _addLink(url, linkinfo) {
    if (!this.linkdb[url]) {
      this.linkdb[url] = linkinfo;
    } else {
      throw new Error(`LinkDB already includes url, ${url}`);
    }
  }

  /**
   * Loads a link DB from a set of files.
   * 
   * @static
   * @param {any} filePath
   * @returns
   * 
   * @memberOf LinkDB
   */
  static loadFromFile(filePath) {
    let rawDB = require(filePath);

    let linkDB = new LinkDB();

    rawDB.forEach((linkRecord) => {
      if (linkRecord["search_url_type"] == "SavedSearch") {
        linkRecord.search_def = SavedSearchDef.fromJSON(linkRecord.search_def);         
      } else if (linkRecord["search_url_type"] == "CTLink") {
        linkRecord.search_def = CTLinkSearchDef.fromJSON(linkRecord.search_def);
      } else {
        done(new Error("Unknown link type"));
      }
      linkDB._addLink(linkRecord.url, linkRecord);
    });

    return linkDB;
  }
}

module.exports = LinkDB;