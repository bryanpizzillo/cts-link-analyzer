'use strict';

// This is the CGov to CTAPI Trial Types mapping
// LHS is Cgov, RHS is CTAPI
// Commented out items are ones without mappings. 
const TRIAL_TYPE_MAP = {
  "treatment": "treatment",
  "supportive care": "supportive_care",
  "diagnostic": "diagnostic",
  "prevention": "prevention",
  "health services research": "health_services_research",
  "screening": "screening"
  //"": "other",
  //"": "basic_science",
  //"Genetics": ""
  //"Biomarker/Laboratory analysis": ""
  //"Tissue collection/Repository": ""
  //"Educational/Counseling/Training": ""
  //"Behavioral study": ""
  //"Natural history/Epidemiology"
};

// This maps cgov phases to CTAPI phases.
// Gatekeeper automatically breaks up II_III to Phase II, Phase III.
// So that means when searching, Phase III will match II_III and III trials.
// For now we will map the API parameters accordingly.
const PHASE_MAP = {
  "Phase I": ["i", "i_ii"],
  "Phase II": ["i_ii", "ii", "ii_iii"],
  "Phase III": ["ii_iii", "iii"],
  "Phase IV": ["iv"]
  //"" : "o" //We don't have an other...  
};

class AbstractCTSearchDef {

  /**
   * Creates an instance of AbstractCTSearchDef.
   * 
   * @param {any} nciPDQMapper An instance of a PDQ NCI Thesaurus mapper
   * 
   * @memberOf AbstractCTSearchDef
   */
  constructor(nciPDQMapper) {
    this.nciPDQMapper = nciPDQMapper;
    //this.pattern_flags

  }  

  _getPaddedCDRID(id) {

    if (id.startsWith("CDR")) {
      //It is already a CDRID.
      return id;
    }

    let tmpstr = `0000000000${id}`;
    tmpstr = tmpstr.substr(tmpstr.length - 10);
    tmpstr = "CDR" + tmpstr;
    return tmpstr;
  }

  getSearchPattern() {
    throw new Error("Not implemented");
  }
  

  /**
   * Identifies if the parameters will require manual creation
   * 
   * @memberOf AbstractCTSearchDef
   */
  needsManualCreation() {
    throw new Error("Not implemented!");
  }

  /**
   * Determines if this search has a missing mapping
   * 
   * @returns
   * 
   * @memberOf AbstractCTSearchDef
   */
  hasMissingMapping() {
    let isMissing = false;

    try {
      this._getAPIDiseases();
    } catch (err) {
      isMissing = true;
    }

    try {
      this._getAPIInterventions();
    } catch (err) {
      isMissing = true;
    }

    //Phase
    try {
      this._getAPIPhases();
    } catch (err) {
      isMissing = true;
    }

    //trialtype
    try {
      this._getAPITrialTypes();
    } catch (err) {
      isMissing = true;
    }

    return isMissing;
  }


  _getDiseases() {
    throw new Error("Not implemented!");
  }  

  _getAPIDiseases() {
    let cgDiseases = this._getDiseases();
    let apiDiseases = [];

    cgDiseases.forEach((disease) => {
      let itrcodes = this.nciPDQMapper.getCCodeByPdqID(this._getPaddedCDRID(disease));

      if (!itrcodes || itrcodes.length < 1) {
        throw new Error("Cannot map code");
      }

      apiDiseases = apiDiseases.concat(itrcodes);
    });

    return apiDiseases;
  }

  _getInterventions() {
    throw new Error("Not implemented!");
  }

  _getAPIInterventions() {
    let cgInterventions = this._getInterventions();

    let apiInterventions = [];

    cgInterventions.forEach((intervention) => {
      let itrcodes = this.nciPDQMapper.getCCodeByPdqID(this._getPaddedCDRID(intervention));

      if (!itrcodes || itrcodes.length < 1) {
        throw new Error("Cannot map code");
      }

      apiInterventions = apiInterventions.concat(itrcodes);
    });

    return apiInterventions;
  }  

  _getPhases() {
    throw new Error("Not implemented!");
  }

  _getAPIPhases() {
    
    let phases = this._getPhases();
    
    let apiPhases = [];

    phases.forEach((phase) => {
      if (PHASE_MAP[phase]) {
        //A phase in the phase map may map to multiple items.
        PHASE_MAP[phase].forEach((p2) => apiPhases.push(PHASE_MAP[phase]));
      } else {
        throw new Error("Cannot map phase");
      }
    })

    return apiPhases;
  }

  _getTrialTypes() {
    throw new Error("Not implemented!");
  }

  _getAPITrialTypes() {

    let types = this._getTrialTypes();
    
    let apiTypes = [];

    types.forEach((type) => {
      if (type.toLowerCase() == "all") {
        return;
      }
      if (TRIAL_TYPE_MAP[type.toLowerCase()]) {
        //A phase in the phase map may map to multiple items.
        apiTypes.push(TRIAL_TYPE_MAP[type.toLowerCase()]);
      } else {
        throw new Error("Cannot map type");
      }
    })

    return apiTypes;
  }

  getCTAPIParams() {
    let response = {
      apiParams: {},
      errors: []
    }

    try {
      let diseases = this._getAPIDiseases();

      if (diseases.length > 0) {
        response.apiParams['diseases.nci_thesaurus_concept_id'] = diseases;
      }
    } catch (err) {
      response.errors.push('Search Contains Unmappable Disease');
    }

    try {
      let interventions = this._getAPIInterventions();

      if (interventions.length > 0) {
        response.apiParams['arms.interventions.intervention_code'] = interventions;
      }
    } catch (err) {
      response.errors.push('Search Contains Unmappable Intervention');
    }

    if (pru) {
      response.apiParams['primary_purpose.primary_purpose_code'] = "";
    }

    return response;
  }
}

module.exports = AbstractCTSearchDef;