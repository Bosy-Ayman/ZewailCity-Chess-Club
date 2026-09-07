import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const TraineeForm = () => {
  const roleTitle = "Trainee Member";
  const roleDesc = "New members who are learning the basics of chess and developing their skills through structured training sessions. This role is focused purely on learning and participation.";
  
  const roleSpecificContent = (
    <Fragment>
        <section className="form-section trainee-section">
            <h2>Section 2: Trainee Skill Assessment</h2>
            <p className="section-note">
                Focus: Understanding your current chess level to place you in the correct training group.
            </p>

            <label htmlFor="trainee-skill-level">What is your current chess skill level?*</label>
            <select id="trainee-skill-level" required>
                <option value="">-- Select Current Level --</option>
                <option value="new">Brand New (Knows how pieces move)</option>
                <option value="beginner">Beginner (Knows openings, few tactics)</option>
                <option value="intermediate">Intermediate (Plays regularly, knows strategies)</option>
            </select>
            
            <label htmlFor="trainee-goals">What are your main goals for joining the ZC Chess Club?*</label>
            <textarea id="trainee-goals" rows="4" required></textarea>
            
        </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      department="Trainee Development"
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default TraineeForm;