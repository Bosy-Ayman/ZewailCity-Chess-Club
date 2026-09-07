import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const HRForm = () => {
  const roleTitle = "HR Member";
  const roleDesc = "The HR team will oversee recruiting new members, ensure smooth integration into the club, manage player pairings for tournaments, and maintain records of participation and interest.";
  
  const roleSpecificContent = (
    <Fragment>
        <section className="form-section hr-section">
            <h2>Section 2 : HR Committee Questions</h2>
            <p className="section-note">
                Focus: {roleDesc}
            </p>

            <label>Do you have any previous experience related to this role (e.g., recruitment, record-keeping, event registration)?*</label>
            <div className="radio-group">
                {/* 'name' attribute is already correct here */}
                <input type="radio" id="hr-exp-yes" name="hr-experience" value="yes" required />
                <label htmlFor="hr-exp-yes">Yes</label>
                
                <input type="radio" id="hr-exp-no" name="hr-experience" value="no" />
                <label htmlFor="hr-exp-no">No</label>
            </div>
            
            <label htmlFor="hr-experience-details">What experiences do you have in this field? If none, please write N/A.*</label>
            {/* FIX #1: Added 'name' attribute. 
              This MUST match the 'htmlFor' in the label.
            */}
            <textarea id="hr-experience-details" name="hr-experience-details" rows="4" required></textarea>
            
        </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
      
      // FIX #2: Pass the required 'department' field
      department="Human Resources" 
    />
  );
};

export default HRForm;