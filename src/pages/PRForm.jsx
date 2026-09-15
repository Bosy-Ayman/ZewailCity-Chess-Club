import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const PRForm = () => {
  const roleTitle = "PR Member";
  const roleDesc = "Build strategic campus partnerships, oversee sponsorship outreach, manage external communications, and lead public relations campaigns for club championships and events.";
  
  const roleSpecificContent = (
    <Fragment>
      <section className="form-section pr-section">
        <h2>Section 2 : Public Relations (PR) Questions</h2>
        <p className="section-note">
          Focus: {roleDesc}
        </p>

        <label>Do you have any previous experience in public relations, event sponsorship, outreach, or student representation?*</label>
        <div className="radio-group">
          <input type="radio" id="pr-exp-yes" name="pr-experience" value="yes" required />
          <label htmlFor="pr-exp-yes">Yes</label>
          
          <input type="radio" id="pr-exp-no" name="pr-experience" value="no" />
          <label htmlFor="pr-exp-no">No</label>
        </div>
        
        <label htmlFor="pr-experience-details">Describe your outreach, communication, or marketing experience (if none, write N/A):*</label>
        <textarea id="pr-experience-details" name="pr-experience-details" rows="4" required></textarea>

        <label htmlFor="pr-partnerships">How would you approach securing sponsorships or collaborating with other university clubs?*</label>
        <textarea id="pr-partnerships" name="pr-partnerships" rows="4" placeholder="Briefly describe your strategy for reaching out to sponsors or partnering with campus organizations..." required></textarea>
      </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      department="Public Relations"
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default PRForm;
