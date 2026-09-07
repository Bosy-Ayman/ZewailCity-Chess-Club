import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const OCHeadForm = () => {
  const roleTitle = "OC Head";
  const roleDesc = "The Organizer Committee (OC) Head is responsible for leading the OC team, planning and coordinating all club tournaments, and ensuring fair play and adherence to rules.";
  
  const roleSpecificContent = (
    <Fragment>
        {/* Section 3 is implicit in the title, skipping it and going straight to details */}
        <section className="form-section oc-head-section">
            <h2>Section 2 : OC Head Questions</h2>
            <p className="section-note">
                Focus: Leading tournament organization, rules knowledge, and management.
            </p>

            <label htmlFor="oc-head-leadership-exp">Have you ever led or organized any tournaments or events before? If yes, please describe briefly.*</label>
            <textarea id="oc-head-leadership-exp" rows="3" required></textarea>
            
            <label htmlFor="oc-head-rules-familiarity">How familiar are you with chess tournament rules and formats (e.g., Swiss, Knockout, time controls, tie-breaks)?*</label>
            <select id="oc-head-rules-familiarity" required>
                <option value="">-- Select Familiarity Level --</option>
                <option value="beginner">Beginner (Only basic knowledge)</option>
                <option value="intermediate">Intermediate (Familiar with main formats/controls)</option>
                <option value="expert">Expert (Deep knowledge of FIDE rules and formats)</option>
            </select>
            
            <label>Will you be available to help organize the Swiss tournament that will take place after 4:00 PM?*</label>
            <div className="radio-group">
                <input type="radio" id="head-swiss-avail-yes" name="head-swiss-avail" value="yes" required />
                <label htmlFor="head-swiss-avail-yes">Yes</label>
                
                <input type="radio" id="head-swiss-avail-no" name="head-swiss-avail" value="no" />
                <label htmlFor="head-swiss-avail-no">No</label>
            </div>
            
            <label>Will you be available to help organize the knockout tournament that will take place throughout the day?*</label>
            <div className="radio-group">
                <input type="radio" id="head-knockout-avail-yes" name="head-knockout-avail" value="yes" required />
                <label htmlFor="head-knockout-avail-yes">Yes</label>
                
                <input type="radio" id="head-knockout-avail-no" name="head-knockout-avail" value="no" />
                <label htmlFor="head-knockout-avail-no">No</label>
            </div>

            <label htmlFor="oc-head-desc">Additional Description (optional)</label>
            <textarea id="oc-head-desc" rows="3"></textarea>

        </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default OCHeadForm;