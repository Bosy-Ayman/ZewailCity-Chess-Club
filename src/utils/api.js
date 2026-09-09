export const safeFetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Response is not valid JSON (e.g. HTML <!DOCTYPE... page)
    }
  }

  if (!res.ok) {
    let errorMsg = `Server returned status ${res.status}`;
    if (data) {
      if (data.error && data.details) {
        errorMsg = `${data.error}: ${data.details}`;
      } else {
        errorMsg = data.error || data.details || data.message || errorMsg;
      }
    }
    throw new Error(errorMsg);
  }

  return data;
};

export const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage quota exceeded for key "${key}". Skipping cache.`, e.message);
  }
};

export const compressImage = (file, maxWidth = 250, maxHeight = 250, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const compressBase64Image = (dataUrl, maxWidth = 200, maxHeight = 200, quality = 0.75) => {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/**
 * Resolves a player's avatar URL based on:
 * 1. Custom avatar from user profile/database (customAvatars dictionary)
 * 2. Static club champion / executive photos in /Winners/ or /Images/
 * 3. Fallback to /Icons/unknown.png
 */
export const getPlayerAvatarUrl = (name, customAvatars = {}) => {
  if (!name || name === "TBD" || name === "BYE" || name === "— BYE —" || name === "Unknown") {
    return "/Icons/unknown.png";
  }

  const clean = name.trim();

  // 1. Direct or case-insensitive match in dynamic profile pictures
  if (customAvatars && customAvatars[clean]) {
    return customAvatars[clean];
  }
  if (customAvatars) {
    const cleanLower = clean.toLowerCase();
    for (const [key, val] of Object.entries(customAvatars)) {
      if (key && key.toLowerCase() === cleanLower && val) {
        return val;
      }
    }
  }

  // 2. Static club player photos
  const staticMap = {
    "Abdelrahman Mohamed": "/Winners/AbdelrahmanMohamed.png",
    "Abdelrahman Mane3": "/Winners/AbdelrahmanMane3.png",
    "Abdelrahman Manee3": "/Winners/AbdelrahmanMane3.png",
    "Abdelwahab Hamdi": "/Winners/AbdelwahabHamdi.jpg",
    "Ahmed Elkodariy": "/Winners/AhmedElkodariy.PNG",
    "Bosy Ayman": "/Winners/BosyAyman.png",
    "Haneen Yasser": "/Winners/HaneenYasser.png",
    "Hanen Yasser": "/Winners/HaneenYasser.png",
    "Mazen Allam": "/Winners/MazenAllam.png",
    "Mazen Ayman": "/Winners/MazenAyman.jpg",
    "Mohamed Eslam": "/Winners/MohamedEslam.png",
    "Mohamed Ezz": "/Winners/MohamedEzz.jpg",
    "Mohamed Ahmed Ezz": "/Winners/MohamedEzz.jpg",
    "Omar Ezz": "/Winners/OmarEzz.jpg",
    "Omar Hafez": "/Winners/OmarHafez.jpeg",
    "Raphael Robier": "/Winners/RaphaelRobier.png",
    "Youssef Yasser": "/Winners/YoussefYasser.jpg",
    "Ahmed Emad": "/Winners/AhmedEmad.png",
    "Amr Khaled": "/Winners/AmrKhaled.jpg",
    "Noureldin Mohamed": "/Winners/NourEldinMohamed.jpg",
    "Nour Eldin Mohamed": "/Winners/NourEldinMohamed.jpg",
    "Noureldin Newer": "/Winners/NourEldinNewer.png",
    "Nour Eldin Newer": "/Winners/NourEldinNewer.png",
    "Salma Ashraf": "/Winners/SalmaAshraf.jpg",
    "Knights": "/Teams/25/Knights.png",
    "Gambling": "/Teams/25/Gambling.png",
    "Epsilon": "/Teams/25/Epsilon.png"
  };

  const cleanLower = clean.toLowerCase();
  for (const [key, val] of Object.entries(staticMap)) {
    if (key.toLowerCase() === cleanLower) {
      return val;
    }
  }

  // 3. Fallback
  return "/Icons/unknown.png";
};


