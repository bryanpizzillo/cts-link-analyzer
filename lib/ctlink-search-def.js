'use strict';

const AbstractCTSearchDef = require('./abstract-ctsearch-def');

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
  constructor(params) {
    super();

    if (params.id && params.idtype) {

        //TODO: Check ID & Type existance

        this.id = params.id;
        this.cdr_id = this._getPaddedCDRID(params.id);

        switch(params.idtype) {
            case "1" : 
                this.id_type = 'Drug';
                break;
            case "2" :  
                this.id_type = 'Institution';
                break;
            case "3" :
                this.id_type = 'LeadOrganization';
                break;
            case "4" :
                this.id_type = 'Investigator';
                break;
            case "5" :
                this.id_type = 'Intervention';
                break;
            default :
                done(new Error(`CTLink: Unknown ID type ${params.idtype} `))
        }
    }
    
    if (params.format) {
        this.format = params.format; 
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
        this.trial_type = tt;
    }

    if (params.phase) {
        let phase = "UNK";

        switch(params.phase) {
            case "0"    : phase = "Phase I"; break;
            case "1"    : phase = "Phase II"; break;
            case "2"    : phase = "Phase III"; break;
            case "3"    : phase = "Phase IV"; break;                
        }
        this.phase = phase;
    }

    if (params.ncc) {
        this.location_clinical_center = params.ncc;
    }

    if (params.cn) {
        //I think this is an int, so we will probably need a lookup
        //but it looks to be ignored
        this.location_country = params.cn;
    }

    if (params.new) {
        this.new_trials = params.new;
    }
    
    if (params.closed) {
        //This is out dated, but if there are links we should flag em.
        this.closed = params.closed;
    }
    
    if (params.diagnosis) {
        //Diagnosis would end up being the same as 
        this.diagnosis = this._getPaddedCDRID(params.diagnosis);
    }

  }
}

module.exports = CTLinkSearchDef;