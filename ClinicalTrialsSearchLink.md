

A clinical trials search link 

## PARAMS:
* id & idtype -- (int, int) Both can be unspecified, BUT If one is set then they are both ```REQUIRED``` 
  * None = 0,
  * Drug = 1,
  * Institution = 2,
  * LeadOrganization = 3,
  * Investigator = 4,
  * Intervention = 5
* format -- (int) 1 (Patient) or 2(Health Professional)  ```REQUIRED```
* diagnosis -- (int) not required, but must be int.
* tt -- (int) trial type.  (Need to see what that maps to...)
* phase -- (int) trial phase (need to create map)
* ncc -- (int) NIH Clinical Center Only; any non-zero value is converted to true
* closed -- (int) Only search closed trials; any non-zero value is converted to true
* new -- (int) New Trials Only; any non-zero value is converted to true.
* cn -- (int) Country (srsly?);  See ClinicalTrialsSearchLinkCountry <-- default option == U.S.A.
  * Well, this is silly.  you can pass in cn.  Then we require it to be an int. then we completely forget that you specified anything and set it to U.S.A.