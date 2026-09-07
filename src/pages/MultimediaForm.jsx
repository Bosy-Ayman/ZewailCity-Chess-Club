import React, { Fragment } from "react";
import ApplicationForm from "./ApplicationForm";

const MultimediaForm = () => {
  const roleTitle = "Media Member";
  const roleDesc = "creating chess-themed visual and media content, including posters, videos, and graphics for the club's posts and events.";
  
  const roleSpecificContent = (
    <Fragment>
        <section className="form-section multimedia-section">
            <h2>Section 2 : Multimedia Committee Questions</h2>
            <p className="section-note">
                Focus: {roleDesc}
            </p>

            <label htmlFor="multimedia-area">Which area are you most interested in?*</label>
            <select id="multimedia-area" required>
                <option value="">-- Select an area --</option>
                <option value="graphic-design">Graphic Design (Posters, Graphics)</option>
                <option value="video-editing">Video Editing (Trailers, Event Highlights)</option>
                <option value="photography">Photography/Videography (Covering Events)</option>
                <option value="all">All areas</option>
            </select>
            
            <label>Will you be available to cover events on campus?*</label>
            <div className="radio-group">
                <input type="radio" id="multimedia-avail-yes" name="multimedia-availability" value="yes" required />
                <label htmlFor="multimedia-avail-yes">Yes</label>
                
                <input type="radio" id="multimedia-avail-no" name="multimedia-availability" value="no" />
                <label htmlFor="multimedia-avail-no">No</label>
            </div>
            
        </section>
    </Fragment>
  );

  return (
    <ApplicationForm
      title={roleTitle}
      department="Multimedia & Media"
      roleDescription={roleDesc}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default MultimediaForm;