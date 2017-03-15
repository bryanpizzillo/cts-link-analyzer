'use strict';

const async           = require('async');
const ConnectionPool  = require('tedious-connection-pool');
const Request         = require('tedious').Request;
const TYPES             = require('tedious').TYPES;

const AbstractProtocolSearchService = require('./abstract-protocol-search-svc');

const PROTOCOL_SEARCH_COLS = [
  'search_id', 'cancer_type', 'cancer_type_stage', 'trial_type', 'trial_status', 
  'alternate_protocol_id', 'location_zip', 'location_zip_proximity', 'location_city',
  'location_state', 'location_country', 'location_institution', 'investigator',
  'lead_org', 'location_clinical_center', 'new_trials', 'treatment_types', 'drugs',
  'phase', 'trial_sponsor', 'special_category', '_abstract_version', '_search_type', '_param_display',
  '_cancer_type_name', '_show_detail_report', 'drug_search_formula', '_state_full_name',
  'drug_id', 'institution_id', 'investigator_id', 'lead_org_id', 'keyword', '_treatment_type_name'
];



/**
 * A class for fetching a Protocol Search Definition from a SQL Database
 * 
 * @class TDSProtocolSearchService
 * @extends {AbstractProtocolSearchService}
 */
class TDSProtocolSearchService extends AbstractProtocolSearchService {

  /**
   * Creates an instance of TDSProtocolSearchService.
   * 
   * @param {any} user Username for the connection
   * @param {any} pw Password for the user
   * @param {any} server The DB server to connect to.
   * @param {any} poolErr A call back for handling a DB pool error.
   * 
   * @memberOf TDSProtocolSearchService
   */
  constructor(user, pw, server, port, poolErr) {

    super();

    let poolConfig = {
      min: 2,
      max: 4,
      log: true
    };

    //Ask Tedious to give us the rows on completion.
    let connInfo = {
      userName: user,
      password: pw,
      server: server,
      options: {
        port: port,
        rowCollectionOnRequestCompletion: true,
        database: 'CDRLiveGK'
      }
    }

    this.pool = new ConnectionPool(poolConfig, connInfo);
    if (poolErr) {
      this.pool.on('error', poolErr);
    }
  }

  /**
   * Cleans up the connection pool.
   * 
   * 
   * @memberOf TDSProtocolSearchService
   */
  dispose() {
    this.pool.drain();
  }

  /**
   * Internal function to make DB request
   * 
   * @param {any} conn The connection to use
   * @param {any} done A completion callback. (err, rows)
   * 
   * @memberOf TDSProtocolSearchService
   */
  _getDBResultsForDef(conn, psid, done) {

    let request = new Request('usp_GetProtocolSearchParamsID', (err, rowCount, rows) => {
      if (err) {
        return done(err);
      }

      //release the connection back to the pool
      conn.release();

      done(null, rows);
    })

    //Add PSID parameter
    request.addParameter('ProtocolSearchID', TYPES.Int, psid);

    //Execute the SQL basically doing the above.
    conn.callProcedure(request);
  }

  /**
   * Internal method
   * 
   * @param {any} rows
   * @param {any} done
   * 
   * @memberOf TDSProtocolSearchService
   */
  _extractPSFromRows(rows, protocolSearchID, done) {
    if (rows.length <= 0) {
      return done(null, null); //Nada
    }

    if (rows.length > 1) {
      return done(new Error(`Protocol Search ID, ${protocolSearchID}, returned more than 1 DB row`))
    }

    if (rows[0].length != PROTOCOL_SEARCH_COLS.length) {
      return done(new Error(`Protocol Search ID, ${protocolSearchID}, DB Table column mismatch, expected ${PROTOCOL_SEARCH_COLS.length}, got ${rows[0].length}`));
    }

    let searchDef = {};
    //Map fields
    for (let i=0; i< PROTOCOL_SEARCH_COLS.length; i++) {
      //TODO: remove cols that start with _
      searchDef[PROTOCOL_SEARCH_COLS[i]] = rows[0][i].value;      
    }

    done(null, searchDef);
  }

  /**
   * Gets a Protocol Search Definition
   * 
   * @param {any} protocolSearchID the protocol search ID to fetch.
   * @param {any} done A completion Callback (err, definition)
   * 
   * @memberOf TDSProtocolSearchService
   */
  getProtocolSearchDef(protocolSearchID, done) {

    async.waterfall([
      (next) => { this.pool.acquire(next) },
      (conn, next) => { this._getDBResultsForDef(conn, protocolSearchID, next) },
      (rows, next) => { this._extractPSFromRows(rows, protocolSearchID, next) }
    ], done);

  }
}

module.exports = TDSProtocolSearchService;