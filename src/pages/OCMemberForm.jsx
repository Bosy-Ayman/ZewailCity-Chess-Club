import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const OCMemberForm = () => {
  const roleTitle = "OC Member";
  const roleDesc = "The Organizer Committee (OC) is responsible for planning and coordinating tournaments, ensuring that matches are conducted fairly and in accordance with the rules.";
  
  const roleSpecificContent = (
    <Fragment>
        {/* Section 3 is implicit in the title, skipping it and going straight to details */}
        <section className="form-section oc-member-section">
            <h2>Section 2: OC Member Questions</h2>
            <p className="section-note">
                Focus: Assisting with tournament planning and execution under the OC Head.
            </p>

            <label htmlFor="oc-member-previous-app">Have you ever applied to this role before? If yes, please tell us about it (include batch/year).*</label>
            <textarea id="oc-member-previous-app" rows="3" required></textarea>
            
            <label>Will you be available to help organize the Swiss tournament that will take place after 4:00 PM?*</label>
            <div className="radio-group">
                <input type="radio" id="swiss-avail-yes" name="swiss-avail" value="yes" required />
                <label htmlFor="swiss-avail-yes">Yes</label>
                
                <input type="radio" id="swiss-avail-no" name="swiss-avail" value="no" />
                <label htmlFor="swiss-avail-no">No</label>
            </div>
            
            <label>Will you be available to help organize the knockout tournament that will take place throughout the day?*</label>
            <div className="radio-group">
                <input type="radio" id="knockout-avail-yes" name="knockout-avail" value="yes" required />
                <label htmlFor="knockout-avail-yes">Yes</label>
                
                <input type="radio" id="knockout-avail-no" name="knockout-avail" value="no" />
                <label htmlFor="knockout-avail-no">No</label>
            </div>

            <label htmlFor="oc-member-desc">Additional Description (optional)</label>
            <textarea id="oc-member-desc" rows="3"></textarea>

        </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      department="Organizing Committee"
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default OCMemberForm;