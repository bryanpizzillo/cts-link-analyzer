'use strict';
const _         = require('lodash');

const AbstractCTSearchDef = require('./abstract-ctsearch-def');

const ID_TYPES = {
  "1" : 'Drug',
  "2" : 'Institution',
  "3" : 'LeadOrganization',
  "4" : 'Investigator',
  "5" : 'Intervention'
}

/**
 * Defines a CTSearch Definition using a ClinicalTrialsSearch Link
 * 
 * @class CTLinkSearchDef
 * @extends {AbstractCTSearchDef}
 */
class CTLinkSearchDef extends AbstractCTSearchDef {


  /**
   * Creates an instance of CTLinkSearchDef.
   * 
   * @param {any} params 
   * 
   * @memberOf CTLinkSearchDef
   */
  constructor(nciPDQMapper, params) {
    super(nciPDQMapper);
  }

  /**
   * Identifies if the parameters will require manual creation
   * 
   * @memberOf CTLinkSearchDef
   */
  needsManualCreation() {

    //If the trial would end up with more than one URL, then it has to be manually
    //created.
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

    map |= (this.diagnosis ) ? 1 : 0;    
    map |= (this.trial_type != null) ? 2 : 0;
    map |= (this.location_clinical_center != null) ? 4 : 0;
    map |= (this.new_trials != null) ? 8 : 0;
    map |= (this.id_type != null && this.id_type == 'Intervention') ? 16 : 0;
    map |= (this.id_type != null && this.id_type == 'Drug') ? 32 : 0;
    map |= (this.phase != null) ? 64 : 0;
    //institution
    //investigator
    //lead_org

    return map;
    
  }

  _getDiseases() {
      
      if (this.diagnosis) {          
          return [this.diagnosis];
      } else {
          return [];
      }
  }

  _getInterventions() {
      if (this.id_type == 'Intervention' || this.id_type == 'Drug') {
          return [this.id];
      } else {
          return [];
      }
  }

  _getPhases() {
    if (this.phase) {
        return [this.phase];
    } else {
        return [];
    }      
  }

  _getTrialTypes() {
    if (this.trial_type) {
        return [this.trial_type];
    } else {
        return [];
    }      
  }


  static fromQueryParams(nciPDQMapper, params, done) {
    let rtnDef = new CTLinkSearchDef(nciPDQMapper);



    if (params.id && params.idtype) {

        //TODO: Check ID & Type existance

        rtnDef.id = params.id;
        rtnDef.cdr_id = rtnDef._getPaddedCDRID(params.id);

        let id_type = ID_TYPES[params.idtype];
        if (id_type != null) {
          rtnDef.id_type = id_type;
        } else {
          return done(new Error(`CTLink: Unknown ID type ${params.idtype} `))
        }
    }
    
    if (params.format) {
        rtnDef.format = params.format; 
    } else {
        console.warn(`CTLink: Required format is missing`);
    }
    
    if (params.tt) {
        let tt = "UNK";

        switch(params.tt) {
            case "0"    : tt = "All"; break;
            case "1"    : tt = "Treatment"; break;
            case "2"    : tt = "Supportive Care"; break;
            case "3"    : tt = "Screening"; break;
            case "4"    : tt = "Prevention"; break;
            case "5"    : tt = "Genetics"; break;
            case "6"    : tt = "Diagnostic"; break;
            case "7"    : tt = "Biomarker/Laboratory analysis"; break;
            case "8"    : tt = "Tissue collection/Repository"; break;
            case "60"   : tt = "Educational/Counseling/Training"; break;
            case "61"   : tt = "Behavioral study"; break;
            case "62"   : tt = "Natural history/Epidemiology"; break;
            case "81"   : tt = "Health services research"; break;
        }
        rtnDef.trial_type = tt;

    }

    if (params.phase) {
        let phase = "UNK";

        switch(params.phase) {
            case "0"    : phase = "Phase I"; break;
            case "1"    : phase = "Phase II"; break;
            case "2"    : phase = "Phase III"; break;
            case "3"    : phase = "Phase IV"; break;                
        }
        rtnDef.phase = phase;
    }

    if (params.ncc) {
        rtnDef.location_clinical_center = params.ncc;
    }

    if (params.cn) {
        //I think this is an int, so we will probably need a lookup
        //but it looks to be ignored
        rtnDef.location_country = params.cn;
    }

    if (params.new) {
        rtnDef.new_trials = params.new;
    }
    
    if (params.closed) {
        //This is out dated, but if there are links we should flag em.
        rtnDef.closed = params.closed;
    }
    
    if (params.diagnosis) {
        //Diagnosis would end up being the same as 
        rtnDef.diagnosis = rtnDef._getPaddedCDRID(params.diagnosis);
    }

    done(null, rtnDef);
  }

  static fromJSON(nciPDQMapper, obj) {
    let rtnDef = new CTLinkSearchDef(nciPDQMapper);

    _.extend(rtnDef, obj);

    return rtnDef;
  }

}

module.exports = CTLinkSearchDef;