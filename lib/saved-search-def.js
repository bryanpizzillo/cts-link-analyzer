'use strict';
const _         = require('lodash');

const AbstractCTSearchDef = require('./abstract-ctsearch-def');


const CLASS_FIELDS = [
  'search_id', 'cancer_type', 'cancer_type_stage', 'trial_type', 'trial_status', 
  'alternate_protocol_id', 'location_zip', 'location_zip_proximity', 'location_city',
  'location_state', 'location_country', 'location_institution', 'investigator',
  'lead_org', 'location_clinical_center', 'new_trials', 'treatment_types', 'drugs',
  'phase', 'trial_sponsor', 'special_category', '_abstract_version', '_search_type', '_param_display',
  '_cancer_type_name', '_show_detail_report', 'drug_search_formula', '_state_full_name',
  'drug_id', 'institution_id', 'investigator_id', 'lead_org_id', 'keyword', '_treatment_type_name'      
]  


class SavedSearchDef extends AbstractCTSearchDef {

  constructor(nciPDQMapper) {
    super(nciPDQMapper);
  }

  /**
   * Identifies if the parameters will require manual creation
   * 
   * @memberOf CTLinkSearchDef
   */
  needsManualCreation() {

    let id_fields = ['treatment_types', 'cancer_type', 'cancer_type_stage', 'drug'];

    //There is more than one id 
    for (let i=0; i< id_fields.length; i++) {
      
      if (this[id_fields[i]] != null && this[id_fields[i]].indexOf(',') != -1) {
        return true;
      }
    }

    //Not handling keywords.
    if (this.keyword) {
      return true;
    }

    // Basically for the rest, if a term would be more than one with the API, then
    // it needs to be manually created

    if ((this._getAPIDiseases().length > 1) || (this._getAPIInterventions().length) > 1) {
      return true;
    }

    //Multiple trial types
    if (this._getAPITrialTypes().length > 1) {
      return true;
    }

    //has more than one phrase
    if (this._getAPIPhases().length > 1) {
      return true;
    }

    //Good to go
    return false;
  }

  getSearchPattern() {

    if (this.hasMissingMapping()) {
      return "MISSINGMAPPING";
    } else if (this.needsManualCreation()) {
      return "MANUAL";
    } 

    //'disease', 'trial_type', 'location_clinical_center', 'new_trials', 'treatment_types'
    let map = 0;

    map |= (this.cancer_type || this.cancer_type_stage) ? 1 : 0;    
    map |= (this.trial_type != null) ? 2 : 0;
    map |= (this.location_clinical_center != null) ? 4 : 0;
    map |= (this.new_trials != null) ? 8 : 0;
    map |= (this.treatment_types != null) ? 16 : 0;
    map |= (this.drug_id != null) ? 32 : 0;
    map |= (this.phase != null) ? 64 : 0;
    //institution
    //investigator
    //lead_org

    return map;
  }

  _getDiseases() {
    if (this.cancer_type_stage) {
      return this.cancer_type_stage.split(',');
    } else if (this.cancer_type) {
      return this.cancer_type.split(',');
    } else {
      return [];
    }
  }

  _getInterventions() {
    let intrList = [];

    if (this.drug_id != null) {
      this.drug_id.split(',').forEach(id => {
        intrList.push(id);
      });
    }

    if (this.treatment_types != null) {
      this.treatment_types.split(',').forEach(id => {
        intrList.push(id);
      });
    }

    return intrList;
  }

  _getPhases() {
    if (this.phase) {
        return this.phase.split(',');
    } else {
        return [];
    }      
  }

  _getTrialTypes() {
    if (this.trial_type) {
        return this.trial_type.split(',');
    } else {
        return [];
    }      
  }  


  /**
   * Gets a list of valid fields on this class.
   * 
   * @static
   * @returns
   * 
   * @memberOf SavedSearchDef
   */
  static getFields() {
    return CLASS_FIELDS;
  }

  static fromSearchID(searchDefSvc, nciPDQMapper, protocolSearchID, done) {

    let searchDef = new SavedSearchDef(nciPDQMapper); 

    searchDefSvc.getProtocolSearchDef(protocolSearchID, (err, res) => {
      if (err) {
        return done(err);
      }

      //Copy items from res to searchDef.
      _.extend(searchDef, res);
      
      done(null, searchDef);
    });

  }

  static fromJSON(nciPDQMapper, obj) {
    let rtnDef = new SavedSearchDef(nciPDQMapper);

    _.extend(rtnDef, obj);

    return rtnDef;
  }
}

module.exports = SavedSearchDef;