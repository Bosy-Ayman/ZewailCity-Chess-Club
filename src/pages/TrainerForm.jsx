import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const TrainerForm = () => {
  const roleTitle = "Trainer Member";
  const roleDesc = "Provide training sessions for club members to enhance their chess skills, and create educational content such as selecting puzzles and posts for social media.";
  
  const roleSpecificContent = (
    <Fragment>
        <section className="form-section trainer-section">
            <h2>Section 7 of 2: Trainer Committee Questions</h2>
            <p className="section-note">
                Focus: Sharing chess knowledge and improving the skills of club members.
            </p>

            <label htmlFor="chess-score">Your highest rating (on chess.com, Lichess, FIDE, etc.)*</label>
            <input type="number" id="chess-score" min="0" required />

            <label>Have you ever applied to this role before?*</label>
            <div className="radio-group">
                <input type="radio" id="trainer-previous-app-yes" name="trainer-previous-app" value="yes" required />
                <label htmlFor="trainer-previous-app-yes">Yes</label>
                
                <input type="radio" id="trainer-previous-app-no" name="trainer-previous-app" value="no" />
                <label htmlFor="trainer-previous-app-no">No</label>
            </div>
            
            <label htmlFor="trainer-availability">What days/times are you available on campus for training sessions? (Description optional)</label>
            <textarea id="trainer-availability" rows="3"></textarea>

            {/* Availability Checklist (Based on form structure) */}
            <p className="section-note" style={{ marginTop: '1.5rem', fontWeight: 600 }}>Please specify your typical availability for each weekday:</p>
            <label htmlFor="sunday-avail">Sunday*</label>
            <input type="text" id="sunday-avail" placeholder="e.g., 2:00 PM - 5:00 PM or Not Available" required />

            <label htmlFor="monday-avail">Monday*</label>
            <input type="text" id="monday-avail" placeholder="e.g., 10:00 AM - 1:00 PM or Not Available" required />
            
            <label htmlFor="tuesday-avail">Tuesday*</label>
            <input type="text" id="tuesday-avail" placeholder="e.g., 2:00 PM - 5:00 PM or Not Available" required />
            
            <label htmlFor="wednesday-avail">Wednesday*</label>
            <input type="text" id="wednesday-avail" placeholder="e.g., 10:00 AM - 1:00 PM or Not Available" required />
            
            <label htmlFor="thursday-avail">Thursday*</label>
            <input type="text" id="thursday-avail" placeholder="e.g., 2:00 PM - 5:00 PM or Not Available" required />

        </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      department="Training & Education"
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default TrainerForm;