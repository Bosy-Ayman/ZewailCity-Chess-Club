import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./History.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// A helper component for scroll-reveal animations using Intersection Observer
const ScrollReveal = ({ children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = React.useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div ref={domRef} className={`scroll-reveal ${isVisible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
};

export default function EventHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [pastEvents, setPastEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events"); // "events", "halloffame", or "highboard"
  const [categoryFilter, setCategoryFilter] = useState("all"); // "all", "tournament", "exhibition", "training", "online"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [selectedPlayerModal, setSelectedPlayerModal] = useState(null);
  const [highboardYearFilter, setHighboardYearFilter] = useState("all");

  // Check URL query params for active tab (e.g. ?tab=halloffame)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["events", "halloffame", "highboard"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Avatar mapping pointing directly to photos in /Winners/ and highboard directories
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const avatarMap = {
    // Winners folder mappings
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
    "NourEldin Newer": "/Winners/NourEldinNewer.png",
    "Knights": "/Teams/25/Knights.png",
    "Gambling": "/Teams/25/Gambling.png",
    "Epsilon": "/Teams/25/Epsilon.png",

    // Leadership & past board members
    "Mohamed Adel": "/Images/highboard/20-21/MohamedAdel.png",
    "Muhammed Alaa Eldin": "/Images/highboard/20-21/MuhammedAlaaEldin.jpg",
    "Aya Nageh": "/Images/highboard/20-21/AyaNageh.png",
    "Mohamed Ebrahim": "/Images/highboard/22-23/MohamedEbrahim.jpg",
    "Ahmed Fateen": "/Images/highboard/22-23/AhmedFateen.png",
    "Thomas Emad": "/Images/highboard/23-24/ThomasEmad.png",
    "Elaf Ahmed": "/Images/highboard/23-24/ElafAhmed.jpg",
    "Amira Elhussainy": "/Images/highboard/23-24/AmiraElhussainy.jpg",
    "Amr Yasser": "/Images/highboard/24-25/AmrYasser.png",
    "Momen Mahmoud": "/Images/highboard/24-25/Momen.png",
    "Momen": "/Images/highboard/24-25/Momen.png",
    "Adham Elawady": "/Images/highboard/24-25/Adham.png",
    "Adham": "/Images/highboard/24-25/Adham.png",
    "Alaa Ibrahim": "/Images/highboard/24-25/Alaa.png",
    "Alaa": "/Images/highboard/24-25/Alaa.png",
    "Aml Ali": "/Images/highboard/24-25/Aml.png",
    "Aml": "/Images/highboard/24-25/Aml.png",
    "Rana Ahmed": "/Images/highboard/24-25/Rana.jpg"
  };

  // Highboard history data containing current and past leadership structures
  const highboardHistory = [
    {
      year: "2026/2027",
      isCurrent: true,
      members: [
        { name: "Ahmed Elkodariy", role: "President", major: "Business", batch: "'25", image: "/Winners/AhmedElkodariy.PNG" },
        { name: "Omar Hafez", role: "Vice President", major: "CIE", batch: "'25", image: "/Winners/OmarHafez.jpeg" },
        { name: "Omar Ezz", role: "Head of Training", major: "Nano", batch: "'25", image: "/Winners/OmarEzz.jpg" },
        { name: "Haneen Yasser", role: "Head of Multimedia", major: "NanoTech", batch: "'24", image: "/Winners/HaneenYasser.png" },
        { name: "Raphael Robier", role: "Head of PR", major: "CSAI", batch: "'25", image: "/Winners/RaphaelRobier.png" },
        { name: "Alaa Ibrahim", role: "Head of Organization", image: "/Images/highboard/24-25/Alaa.png" },
        { name: "Unknown", role: "Head of HR", image: "/Icons/unknown.png" }
      ]
    },
    {
      year: "2025/2026",
      isCurrent: false,
      members: [
        { name: "Bosy Ayman", role: "President", major: "CSAI", batch: "'22", image: "/Winners/BosyAyman.png" },
        { name: "Abdelrahman Mohamed", role: "Vice President", major: "CSAI", batch: "'23", image: "/Winners/AbdelrahmanMohamed.png" },
        { name: "Aml Ali", role: "Head of HR", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/Aml.png" },
        { name: "Momen Mahmoud", role: "Head of Training", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/Momen.png" },
        { name: "Rana Ahmed", role: "Head of Multimedia", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/Rana.jpg" },
        { name: "Alaa Ibrahim", role: "Head of Organization", major: "Environmental", batch: "'23", image: "/Images/highboard/24-25/Alaa.png" },
        { name: "Adham Elawady", role: "Head of PR", major: "CSAI", batch: "'22", image: "/Images/highboard/24-25/Adham.png" }
      ]
    },
    {
      year: "2024/2025",
      isCurrent: false,
      members: [
        { name: "Bosy Ayman", role: "President", major: "CSAI", batch: "'22", image: "/Winners/BosyAyman.png" },
        { name: "Abdelrahman Mohamed", role: "Vice President", major: "CSAI", batch: "'23", image: "/Winners/AbdelrahmanMohamed.png" },
        { name: "Aml Ali", role: "Head of HR", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/Aml.png" },
        { name: "Momen Mahmoud", role: "Head of Training", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/Momen.png" },
        { name: "Rana Ahmed", role: "Head of Multimedia", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/Rana.jpg" },
        { name: "Amr Yasser", role: "Head of Organization - Spring", major: "CSAI", batch: "'23", image: "/Images/highboard/24-25/AmrYasser.png" },
        { name: "Alaa Ibrahim", role: "Head of Organization - Fall", major: "Environmental", batch: "'23", image: "/Images/highboard/24-25/Alaa.png" },
        { name: "Adham Elawady", role: "Head of PR", major: "CSAI", batch: "'22", image: "/Images/highboard/24-25/Adham.png" }
      ]
    },
    {
      year: "2023/2024",
      isCurrent: false,
      members: [
        { name: "Thomas Emad", role: "President", major: "Physics", batch: "'21", image: "/Images/highboard/23-24/ThomasEmad.png" },
        { name: "Youssef Zanny", role: "Vice President", major: "Unknown", batch: "'21", image: "/Icons/unknown.png" },
        { name: "Elaf Ahmed", role: "Head of HR", major: "Biomedical Sciences (BMS)", batch: "'21", image: "/Images/highboard/23-24/ElafAhmed.jpg" },
        { name: "Amira Elhussainy", role: "Head of Training", major: "Nanotechnology (NanoTech)", batch: "'22", image: "/Images/highboard/23-24/AmiraElhussainy.jpg" },
        { name: "Mohamed Ahmed Ezz", role: "Head of Organization", major: "Physics", batch: "'21", image: "/Winners/MohamedEzz.jpg" }
      ]
    },
    {
      year: "2022/2023",
      isCurrent: false,
      members: [
        { name: "Mohamed Ebrahim", role: "President", major: "Aerospace Engineering", batch: "'20", image: "/Images/highboard/22-23/MohamedEbrahim.jpg" },
        { name: "Ahmed Fateen", role: "Vice President", major: "CIE", batch: "'19", image: "/Images/highboard/22-23/AhmedFateen.png" },
        { name: "Elaf Ahmed", role: "Head of HR", major: "Biomedical Sciences (BMS)", batch: "'21", image: "/Images/highboard/23-24/ElafAhmed.jpg" },
        { name: "Aly Faragallah", role: "Head of Marketing", major: "unknown", batch: "'21", image: "/Icons/unknown.png" },
        { name: "Sama Yousef", role: "Head of Organization", major: "Unknown", batch: "'20", image: "/Images/highboard/22-23/SamaYousef.jpg" }
      ]
    },
    {
      year: "2021/2022",
      isCurrent: false,
      members: [
        { name: "Mohamed Ebrahim", role: "President", major: "Aerospace Engineering", batch: "'20", image: "/Images/highboard/22-23/MohamedEbrahim.jpg" },
        { name: "Ahmed Fateen", role: "Vice President", major: "CIE", batch: "'19", image: "/Images/highboard/22-23/AhmedFateen.png" },
        { name: "Unknown", role: "Head of HR", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Training", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Organization", image: "/Icons/unknown.png" }
      ]
    },
    {
      year: "2020/2021",
      isCurrent: false,
      members: [
        { name: "Mohamed Adel", role: "President", major: "Physics", batch: "'18", image: "/Images/highboard/20-21/MohamedAdel.png" },
        { name: "Muhammed Alaa Eldin", role: "Vice President", major: "Physics", batch: "'18", image: "/Images/highboard/20-21/MuhammedAlaaEldin.jpg" },
        { name: "Aya Nageh", role: "Vice President", major: "Communications & Info (CIE)", batch: "'19", image: "/Images/highboard/20-21/AyaNageh.png" },
        { name: "Unknown", role: "Head of HR", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Training", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Organization", image: "/Icons/unknown.png" }
      ]
    },
    {
      year: "2019/2020",
      isCurrent: false,
      members: [
        { name: "Mohamed Adel", role: "President", major: "Physics", batch: "'18", image: "/Images/highboard/19-20/MohamedAdel.png" },
        { name: "Muhammed Alaa Eldin", role: "Vice President", major: "Physics", batch: "'18", image: "/Images/highboard/19-20/MuhammedAlaaEldin.jpg" },
        { name: "Aya Nageh", role: "Vice President", major: "Communications & Info (CIE)", batch: "'19", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of HR", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Training", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Organization", image: "/Icons/unknown.png" }
      ]
    },
    {
      year: "2018/2019",
      isCurrent: false,
      members: [
        { name: "Unknown", role: "President", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Vice President", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Vice President", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of HR", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Training", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Organization", image: "/Icons/unknown.png" }
      ]
    },
    {
      year: "2017/2018",
      isCurrent: false,
      members: [
        { name: "Unknown", role: "President", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Vice President", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Vice President", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of HR", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Training", image: "/Icons/unknown.png" },
        { name: "Unknown", role: "Head of Organization", image: "/Icons/unknown.png" }
      ]
    }
  ];

  // Enhanced historical events with photos, categories, and full highlights
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultHistoricalEvents = [
    {
      _id: "hist-2026-spring",
      title: "King's Quest IV Championship 2026",
      type: "Swiss System (5 Rounds)",
      category: "tournament",
      startDate: "2026-05-15",
      location: "Academic Building",
      image: "/Images/Tournaments/2025-2026/KingQuest4.jpg",
      description: "5-round intense Swiss tournament featuring the top players of Zewail City competing for the 2026 season championship.",
      playersList: [
        { name: "🥇 1st Place: Abdelrahman Mohamed" },
        { name: "🥈 2nd Place: Abdelwahab Hamdi" },
        { name: "🥉 3rd Place: Mohamed Eslam" }
      ]
    },
    {
      _id: "hist-2026-careerfair",
      title: "ZC Career Fair Chess Booth & Exhibition",
      type: "Campus Exhibition & Tactics",
      category: "exhibition",
      startDate: "2026-04-22",
      location: "Zewail City Student Center",
      image: "/Images/Tournaments/2024-2025/CareerFair.jpg",
      description: "Interactive chess booth, speed puzzle solving, and open exhibition matches hosted during the annual Zewail City Career Fair.",
      playersList: [
        { name: "🎯 Speed Puzzle Booth" },
        { name: "👥 Student Activity Exhibition" }
      ]
    },
    {
      _id: "AAST university championship",
      title: "AAST University Championship",
      type: "Swiss System (5 Rounds)",
      category: "tournament",
      startDate: "2026-05-14",
      location: "AAST University",
      image: "/Images/Tournaments/2025-2026/AASTUni.jpg",
      description: "5-round Swiss tournament organized by AAST chess club for October university sector — 9 members represented ZC with outstanding results including 🥇 1st place (Bosy Ayman), 🏅 4th place (Salma Ashraf), and 🏅 6th place (Haneen Yasser) in the girls' category.",
      playersList: [
        { name: "🥇 1st Place (Girls): Bosy Ayman" },
        { name: "🏅 4th Place (Girls): Salma Ashraf" },
        { name: "🏅 6th Place (Girls): Haneen Yasser" },
        { name: "🏅 4th Place (Boys): Abdelrahman Mohamed" },
        { name: "🏅 5th Place (Boys): Raphael Robier" },
        { name: "🏅 6th Place (Boys): Omar Ezz" },
        { name: "🏅 7th Place (Boys): Omar Hafez" },
        { name: "🏅 8th Place (Boys): Ahmed Elkodariy" }
      ]
    },
    {
      _id: "hist-2026-puzzle",
      title: "ZC Chess Puzzle Challenge 2026",
      type: "Puzzle Tactics Arena",
      category: "training",
      startDate: "2026-04-10",
      location: "Student Center, Zewail City",
      image: "/Images/Tournaments/2025-2026/PuzzleChallenge.jpg",
      description: "Interactive speed tactics challenge where participants competed to solve high-difficulty tactical positions in record time.",
      playersList: [
        { name: "🏆 Winner: Omar Hafez" },
        { name: "🧩 Tactics Arena Participant" }
      ]
    },
    {
      _id: "hist-2026-ramadan",
      title: "Ramadan Knockout Tournament 2026",
      type: "Rapid Tournament",
      category: "tournament",
      startDate: "2026-03-25",
      location: "Academic Building",
      image: "/Images/Tournaments/2025-2026/RamadanKnockout26.jpg",
      description: "Annual Ramadan rapid tournament bringing together UST students in a spirited nighttime knockout competition.",
      playersList: [
        { name: "🥇 Champion: Omar Ezz" },
        { name: "🥈 Runner-up: Omar Hafez" },
        { name: "🥉 3rd Place: Abdelwahab Hamdi" }
      ]
    },
    {
      _id: "2026-esport",
      title: "Esports Blitz Tournament 2026",
      type: "Esports Blitz Arena",
      category: "tournament",
      startDate: "2026-02-15",
      location: "Academic Building - Zone E",
      image: "/Images/Tournaments/2025-2026/Esports.jpg",
      description: "Esports blitz chess tournament organized on campus featuring rapid clocks and dynamic digital setups.",
      playersList: [
        { name: "🥇 Champion: Abdelrahman Mohamed" },
        { name: "🥈 Runner-up: Mazen Ayman" },
        { name: "🥉 3rd Place: Omar Hafez" }
      ]
    },
    {
      _id: "2025-teams",
      title: "Teams Championship 2025",
      type: "Teams Tournament",
      category: "tournament",
      startDate: "2025-11-08",
      location: "Academic Building - Palm Tree",
      image: "/Images/Tournaments/2025-2026/TeamsTournament.jpg",
      description: "Campus trios team championship battling across multiple board rotations for the club's premier squad cup.",
      playersList: [
        { name: "🥇 Champions (Knights): Ahmed Elkodariy, Omar Hafez, Omar Ezz" },
        { name: "🥈 Runners-up (Gambling): Abdelrahman Mohamed, Abdelrahman Mane3, Mohamed Eslam" },
        { name: "🥉 3rd Place (Epsilon): Noureldin Newer, Amr Khaled, Youssef Yasser" }
      ]
    },
    {
      _id: "Knockout Tournament - Fall 2025",
      title: "Knockout Tournament Fall 2025",
      type: "Knockout Tournament",
      category: "tournament",
      startDate: "2025-10-04",
      location: "Zewail City Academic Hall",
      image: "/Images/Tournaments/2024-2025/KingQuest1_1.jpg",
      description: "High-voltage single-elimination rapid showdown to kick off the 2025-2026 competitive season.",
      playersList: [
        { name: "🥇 Champion: Ahmed Elkodariy" },
        { name: "🥈 Runner-up: Abdelrahman Mohamed" }
      ]
    },
    {
      _id: "hist-2025-nile",
      title: "Nile University Championship",
      type: "Inter-University Championship",
      category: "tournament",
      startDate: "2025-05-06",
      location: "Nile University",
      image: "/Images/Tournaments/2024-2025/NileUni.jpg",
      description: "6 members represented Zewail City at the Nile University Chess Tournament, bringing home historic achievements including 🥇 1st place (Bosy Ayman) and 🏅 4th place (Haneen Yasser) in the girls' category.",
      playersList: [
        { name: "🥇 1st Place (Girls' Category): Bosy Ayman" },
        { name: "🏅 4th Place (Girls' Category): Haneen Yasser" },
        { name: "🏆 6 ZC Representatives" },
        { name: "🏛️ Inter-University Honor" }
      ]
    },
    {
      _id: "hist-2025-kq2",
      title: "King's Quest II Tournament",
      type: "Swiss Format (5 Rounds)",
      category: "tournament",
      startDate: "2025-04-10",
      location: "Academic Building - Palm Tree",
      image: "/Images/Tournaments/2024-2025/KingQuest2.jpg",
      description: "King’s Quest II tournament featuring 32 participants competing in a Swiss format across high-tension classical & rapid matches.",
      playersList: [
        { name: "🥇 Champion: Mohamed Ezz" },
        { name: "🥈 Runner-up: Mazen Allam" },
        { name: "🥉 3rd Place: Kareem Mahmoud" },
        { name: "👥 32 Participants" }
      ]
    },
    {
      _id: "hist-2025-ramadan",
      title: "Ramadan Chess Championship 2025",
      type: "Knockout Tournament",
      category: "tournament",
      startDate: "2025-03-25",
      location: "Academic Building - Palm Tree",
      image: "/Images/Tournaments/2024-2025/RamadanKnockout25.jpg",
      description: "Annual Ramadan Chess Championship featuring top campus masters competing in nighttime elimination brackets.",
      playersList: [
        { name: "🥇 Champion: Abdelrahman Mohamed" },
        { name: "🥈 Runner-up: Mazen Allam" },
        { name: "🥉 3rd Place: Abdelrahman Mane3" }
      ]
    },
    {
      _id: "hist-2025-kq1",
      title: "King's Quest I Tournament",
      type: "Swiss Format",
      category: "tournament",
      startDate: "2025-03-15",
      location: "Academic Building - Palm Tree",
      image: "/Images/Tournaments/2024-2025/KingQuest1_3.png",
      description: "Inaugural King’s Quest I tournament featuring 24 participants competing in a multi-round Swiss format.",
      playersList: [
        { name: "🥇 Champion: Mohamed Ezz" },
        { name: "🥈 Runner-up: Mazen Allam" },
        { name: "🥉 3rd Place: Noureldin Mohamed" },
        { name: "👥 24 Participants" }
      ]
    },
    {
      _id: "hist-2022-2023",
      title: "Knockout Tournament - Spring 2024",
      type: "Blitz Tournament",
      category: "tournament",
      startDate: "2024-04-05",
      location: "Academic Building",
      image: "/Images/Tournaments/2023-2024/Knockout24.jpg",
      description: "Spring rapid knockout tournament with intense tiebreakers and endgame puzzles.",
      playersList: [
        { name: "🏆 Tournament Feature: Campus Blitz" }
      ]
    },
    {
      _id: "hist-2020-2021",
      title: "Knockout Tournament 2021",
      type: "Rapid Tournament",
      category: "tournament",
      startDate: "2021-04-15",
      location: "Service Building",
      image: "/Images/Tournaments/2020-2021/Knockout21.jpg",
      description: "2020/2021 Rapid Knockout Tournament crowning the fastest tacticians on campus. Special commentary by Karim Magdi and Robair Raouf, supported by Mohamed Adel and Jimmy.",
      playersList: [
        { name: "🥇 Champion: Moustafa Ebada" },
        { name: "🥈 Runner-up: Ahmed Emad" }
      ]
    },
    {
      _id: "hist-2021-Women",
      title: "Women's Campus Tournament 2021",
      type: "Rapid Tournament",
      category: "tournament",
      startDate: "2021-07-20",
      location: "Zewail City Service Building",
      image: "/Images/Tournaments/2020-2021/WomanTournament.jpg",
      description: "Dedicated campus tournament celebrating women in chess at Zewail City.",
      playersList: [
        { name: "👑 Women's Campus Championship" }
      ]
    },

    {
      _id: "hist-2019-1",
      title: "Grandmasters Simultaneous Exhibition (Simul)",
      type: "Exhibition Match",
      category: "exhibition",
      startDate: "2019-11-15",
      location: "Service Building",
      image: "/Images/Tournaments/2018-2019/shahenda.jpg",
      description: "Historic simultaneous exhibition match hosting African Champions GM Adham Fawzy and WGM Shahinda Wafa playing against 20 Zewail City students simultaneously.",
      playersList: [
        { name: "👑 GM Adham Fawzy" },
        { name: "👑 WGM Shahinda Wafa" },
        { name: "👥 20 ZC Challengers" }
      ]
    },
    {
      _id: "hist-2018-1",
      title: "International Master Simultaneous Exhibition 2018",
      type: "Exhibition Match",
      category: "exhibition",
      startDate: "2018-04-12",
      location: "Service Building",
      image: "/Images/Tournaments/2018-2019/adhamfawzy.jpg",
      description: "First landmark grand exhibition where International Master Adham Fawzy took on 16 ZC Chess Club players simultaneously in a marathon masterclass.",
      playersList: [
        { name: "👑 IM Adham Fawzy" },
        { name: "♟️ 16 ZC Players" }
      ]
    }
  ];

  // Helper to parse highlight strings into rich format (emoji, role, name)
  const parseHighlight = (highlightText) => {
    const match = highlightText.match(/(🥇|🥈|🥉|🏅|🏆|🎯|♟️|👥|👑)\s*([^:]+):\s*(.*)/);
    if (match) {
      const emoji = match[1];
      const role = match[2].trim();
      const name = match[3].trim();
      return { emoji, role, name, isPlacement: true };
    }
    
    const simpleMatch = highlightText.match(/(🥇|🥈|🥉|🏅|🏆|🎯|♟️|👥|👑)\s*(.*)/);
    if (simpleMatch) {
      return { emoji: simpleMatch[1], role: "", name: simpleMatch[2].trim(), isPlacement: false };
    }
    
    return { emoji: "♟️", role: "", name: highlightText.trim(), isPlacement: false };
  };

  // Helper to format image URLs safely (handling local assets & backend uploads)
  const getImageUrl = (imgSrc) => {
    if (!imgSrc) return "/Icons/unknown.png";
    if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://")) {
      return imgSrc;
    }
    if (imgSrc.startsWith("/uploads") || imgSrc.startsWith("uploads")) {
      const cleanPath = imgSrc.startsWith("/") ? imgSrc : `/${imgSrc}`;
      return `${API_BASE}${cleanPath}`;
    }
    return imgSrc;
  };

  // Helper for image fallback to prevent broken UI icons
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "/Icons/unknown.png";
  };

  // Helper to trigger rich player trading card modal
  const openPlayerModal = (playerName, extraData = {}) => {
    if (!playerName || playerName.toLowerCase() === "unknown") return;
    const cleanName = playerName.trim().replace(/\(.*\)/, "").trim();
    if (!cleanName) return;

    const statsData = sortedPlayers.find((s) => s.name.toLowerCase() === cleanName.toLowerCase());
    const champData = championsGallery.find((c) => c.name.toLowerCase() === cleanName.toLowerCase());

    const avatar =
      extraData.avatar ||
      (statsData && statsData.avatar) ||
      avatarMap[cleanName] ||
      (champData && champData.image) ||
      "/Icons/unknown.png";

    // Build comprehensive, deduplicated honors list:
    let honorsList = [];
    if (statsData && statsData.titles && statsData.titles.length > 0) {
      honorsList = [...statsData.titles];
    } else if (champData && champData.trophies) {
      honorsList = champData.trophies.split("•").map((s) => s.trim()).filter(Boolean);
    } else if (champData && champData.desc) {
      honorsList = champData.desc
        .split("•")
        .map((s) => s.trim())
        .filter((s) => s && (s.includes("🥇") || s.includes("🥈") || s.includes("🥉") || s.includes("🏅") || s.includes("🏆") || s.includes("👑")));
    } else if (extraData.titles) {
      honorsList = Array.isArray(extraData.titles) ? extraData.titles : [extraData.titles];
    }

    // Deduplicate honors list strictly
    honorsList = Array.from(new Set(honorsList.map((h) => h.trim()))).filter(Boolean);

    const playerData = {
      name: cleanName,
      score: statsData ? statsData.score : (extraData.score || 0),
      gold: statsData ? statsData.gold : (extraData.gold || 0),
      silver: statsData ? statsData.silver : (extraData.silver || 0),
      bronze: statsData ? statsData.bronze : (extraData.bronze || 0),
      titles: honorsList,
      role: extraData.role || (champData ? champData.role : (statsData ? statsData.badge : "")),
      desc: extraData.desc || (champData ? champData.trophies : ""),
      major: extraData.major || "",
      batch: extraData.batch || "",
      avatar: avatar
    };

    setSelectedPlayerModal(playerData);
  };

  // State for Podium Category Selection: 'both', 'boys', 'girls'
  const [podiumCategory, setPodiumCategory] = useState("both");

  const { sortedPlayers, championsGallery, boysPodium, girlsPodium } = useMemo(() => {
    const playerScores = {};
    const eventsToProcess = pastEvents && pastEvents.length > 0 ? pastEvents : defaultHistoricalEvents;

    eventsToProcess.forEach((t) => {
      if (t.playersList) {
        t.playersList.forEach((p) => {
          if (!p.name) return;
          const colonIdx = p.name.indexOf(":");
          if (colonIdx !== -1) {
            const placeStr = p.name.substring(0, colonIdx).trim();
            const namesStr = p.name.substring(colonIdx + 1).trim();

            const rawNames = namesStr.split(",");
            rawNames.forEach((rawName) => {
              const clean = rawName.trim().replace(/\(.*\)/, "").trim();
              if (
                !clean ||
                clean.toLowerCase() === "unknown" ||
                clean.toLowerCase().includes("team") ||
                clean.toLowerCase().includes("representatives") ||
                clean.toLowerCase().includes("participants") ||
                clean.toLowerCase().includes("challengers") ||
                clean.toLowerCase().includes("champion")
              ) {
                return;
              }

              if (!playerScores[clean]) {
                playerScores[clean] = { score: 0, gold: 0, silver: 0, bronze: 0, eventsCount: 0, titles: [] };
              }

              playerScores[clean].eventsCount += 1;

              const lowerPlace = placeStr.toLowerCase();
              if (placeStr.includes("🥇") || lowerPlace.includes("1st") || lowerPlace.includes("champion")) {
                playerScores[clean].score += 3;
                playerScores[clean].gold += 1;
                playerScores[clean].titles.push(`🥇 ${t.title} (Champion)`);
              } else if (placeStr.includes("🥈") || lowerPlace.includes("2nd") || lowerPlace.includes("runner-up")) {
                playerScores[clean].score += 2;
                playerScores[clean].silver += 1;
                playerScores[clean].titles.push(`🥈 ${t.title} (Runner-up)`);
              } else if (placeStr.includes("🥉") || lowerPlace.includes("3rd")) {
                playerScores[clean].score += 1;
                playerScores[clean].bronze += 1;
                playerScores[clean].titles.push(`🥉 ${t.title} (3rd Place)`);
              } else if (placeStr.includes("🏅") || lowerPlace.includes("4th") || lowerPlace.includes("5th") || lowerPlace.includes("6th") || lowerPlace.includes("7th") || lowerPlace.includes("8th")) {
                playerScores[clean].score += 1;
                const cleanRank = placeStr
                  .replace(/[^\w\s\d]/g, "")
                  .replace(/Boys/gi, "")
                  .replace(/Girls/gi, "")
                  .replace(/Category/gi, "")
                  .trim();
                playerScores[clean].titles.push(`🏅 ${t.title}${cleanRank ? ` (${cleanRank})` : ""}`);
              }
            });
          }
        });
      }
    });

    const sorted = Object.keys(playerScores)
      .map((name) => {
        const stats = `${playerScores[name].gold} 🥇 | ${playerScores[name].silver} 🥈 | ${playerScores[name].bronze} 🥉`;
        return {
          name,
          score: playerScores[name].score,
          gold: playerScores[name].gold,
          silver: playerScores[name].silver,
          bronze: playerScores[name].bronze,
          stats,
          titles: playerScores[name].titles,
          avatar: avatarMap[name] || "/Icons/unknown.png"
        };
      })
      .sort((a, b) => b.score - a.score || b.gold - a.gold);

    // Individual Boys Champions Podium (calculated from tournament timeline)
    // Abdelrahman Mohamed: 🥇 KQ IV + 🥇 Esports + 🥇 Ramadan '25 = 3G | 🥈 Fall KO '25 + 🥈 Teams = 2S | 0B (13 pts)
    // Co-2nd Place Tied (6 pts, 2G each): Mohamed Ezz (KQ I & II), Ahmed Elkodariy (Fall KO & Teams), Omar Ezz (Ramadan '26 & Teams)
    // 3rd Place (6 pts, 1G 1S 1B): Omar Hafez (Teams 🥇, Ramadan '26 🥈, Esports 🥉)
    const boysP = {
      gold: {
        name: "Abdelrahman Mohamed",
        stats: "3 🥇 | 2 🥈 | 0 🥉",
        badge: "Grand Champion (KQ IV, Esports, Ramadan '25)",
        avatar: "/Winners/AbdelrahmanMohamed.png"
      },
      silver: {
        name: "Mohamed Ezz, Ahmed Elkodariy & Omar Ezz",
        firstName: "Mohamed Ezz",
        stats: "2 🥇 | 0 🥈 | 0 🥉 (Each)",
        badge: "Tied 2nd Place — 2x 🥇 Champions Each",
        avatar: "/Winners/MohamedEzz.jpg",
        tied: [
          { name: "Mohamed Ezz", avatar: "/Winners/MohamedEzz.jpg", badge: "KQ I & KQ II Champion" },
          { name: "Ahmed Elkodariy", avatar: "/Winners/AhmedElkodariy.PNG", badge: "Fall KO '25 & Teams Champion" },
          { name: "Omar Ezz", avatar: "/Winners/OmarEzz.jpg", badge: "Ramadan '26 & Teams Champion" }
        ]
      },
      bronze: {
        name: "Omar Hafez",
        stats: "1 🥇 | 1 🥈 | 1 🥉",
        badge: "3rd Place (Triple Medalist)",
        avatar: "/Winners/OmarHafez.jpeg"
      }
    };

    // Individual Girls Champions Podium
    const girlsP = {
      gold: {
        name: "Bosy Ayman",
        stats: "2x 🥇 1st Place Inter-Uni (AAST & Nile)",
        badge: "Inter-University Champion",
        avatar: "/Winners/BosyAyman.png"
      },
      silver: {
        name: "Haneen Yasser",
        stats: "🏅 4th (Nile) & 6th (AAST) • High Board",
        badge: "Inter-Uni Double Finalist & Multimedia Head",
        avatar: "/Winners/HaneenYasser.png"
      },
      bronze: {
        name: "Salma Ashraf",
        stats: "🏅 4th Place AAST Inter-Uni",
        badge: "AAST University Finalist",
        avatar: "/Winners/SalmaAshraf.jpg"
      }
    };
    // Curated Champions Gallery – trophies based on tournament timeline
    const winnersList = [
      { name: "Abdelrahman Mohamed", role: "Grand Champion & Former VP", desc: "🥇 KQ IV 2026 • 🥇 Esports 2026 • 🥇 Ramadan 2025 | 🥈 Fall KO 2025 • 🥈 Teams (Gambling)", image: "/Winners/AbdelrahmanMohamed.png", trophies: "3x 🥇 • 2x 🥈 • 0x 🥉", category: "boys" },
      { name: "Bosy Ayman", role: "President (24-26) & Inter-Uni Champion", desc: "🥇 1st Place AAST University Championship (Girls) • 🥇 1st Place Nile University Championship (Girls)", image: "/Winners/BosyAyman.png", trophies: "2x 🥇 • 0x 🥈 • 0x 🥉", category: "girls" },
      { name: "Haneen Yasser", role: "Head of Multimedia (26-27) & Inter-Uni Finalist", desc: "🏅 4th Place Nile University Championship (Girls) • 🏅 6th Place AAST University Championship (Girls)", image: "/Winners/HaneenYasser.png", trophies: "🏅 4th Place (Nile) • 🏅 6th Place (AAST)", category: "girls" },
      { name: "Salma Ashraf", role: "Inter-Uni Finalist (Girls)", desc: "🏅 4th Place AAST University Championship (Girls)", image: "/Winners/SalmaAshraf.jpg", trophies: "🏅 4th Place Inter-Uni Finalist (AAST)", category: "girls" },
      { name: "Ahmed Elkodariy", role: "President (26-27) & Campus Champion", desc: "🥇 Fall 2025 Knockout Champion • 🥇 Teams Championship (Knights)", image: "/Winners/AhmedElkodariy.PNG", trophies: "2x 🥇 • 0x 🥈 • 0x 🥉", category: "boys" },
      { name: "Mohamed Ezz", role: "King's Quest Multi-Champion", desc: "🥇 King's Quest I Champion • 🥇 King's Quest II Champion", image: "/Winners/MohamedEzz.jpg", trophies: "2x 🥇 • 0x 🥈 • 0x 🥉", category: "boys" },
      { name: "Omar Ezz", role: "Head of Training & Ramadan Champion", desc: "🥇 Ramadan Knockout 2026 Champion • 🥇 Teams Championship (Knights)", image: "/Winners/OmarEzz.jpg", trophies: "2x 🥇 • 0x 🥈 • 0x 🥉", category: "boys" },
      { name: "Omar Hafez", role: "Vice President & Tactics Specialist", desc: "🥇 Teams Championship (Knights) • 🥈 Ramadan 2026 Runner-up • 🥉 Esports 2026 3rd Place", image: "/Winners/OmarHafez.jpeg", trophies: "1x 🥇 • 1x 🥈 • 1x 🥉", category: "boys" },
      { name: "Mazen Allam", role: "Grand Finalist & Rapid Contender", desc: "🥈 King's Quest I Runner-up • 🥈 King's Quest II Runner-up • 🥈 Ramadan 2025 Runner-up", image: "/Winners/MazenAllam.png", trophies: "0x 🥇 • 3x 🥈 • 0x 🥉", category: "boys" },
      { name: "Abdelwahab Hamdi", role: "Podium Master & Swiss Contender", desc: "🥈 King's Quest IV Runner-up • 🥉 Ramadan 2026 3rd Place", image: "/Winners/AbdelwahabHamdi.jpg", trophies: "0x 🥇 • 1x 🥈 • 1x 🥉", category: "boys" },
      { name: "Mohamed Eslam", role: "Swiss & Teams Contender", desc: "🥉 King's Quest IV 3rd Place • 🥈 Teams Championship (Gambling)", image: "/Winners/MohamedEslam.png", trophies: "0x 🥇 • 1x 🥈 • 1x 🥉", category: "boys" },
      { name: "Raphael Robier", role: "Head of PR & Inter-Uni Representative", desc: "🏅 5th Place AAST University Championship (Boys)", image: "/Winners/RaphaelRobier.png", trophies: "🏅 Inter-Uni Honor Finalist", category: "boys" },
      { name: "Abdelrahman Mane3", role: "Teams & Rapid Finalist", desc: "🥉 Ramadan 2025 3rd Place • 🥈 Teams Championship (Gambling)", image: "/Winners/AbdelrahmanMane3.png", trophies: "0x 🥇 • 1x 🥈 • 1x 🥉", category: "boys" },
      { name: "Youssef Yasser", role: "Teams Championship Bronze", desc: "🥉 Teams Championship 3rd Place (Epsilon)", image: "/Winners/YoussefYasser.jpg", trophies: "0x 🥇 • 0x 🥈 • 1x 🥉", category: "boys" },
      { name: "Ahmed Emad", role: "Rapid Finalist", desc: "🥈 2021 Knockout Tournament Runner-up", image: "/Winners/AhmedEmad.png", trophies: "0x 🥇 • 1x 🥈 • 0x 🥉", category: "boys" },
      { name: "Noureldin Mohamed", role: "Classical Finalist", desc: "🥉 King's Quest I 3rd Place", image: "/Winners/NourEldinMohamed.jpg", trophies: "0x 🥇 • 0x 🥈 • 1x 🥉", category: "boys" },
      { name: "Amr Khaled", role: "Teams Championship Bronze", desc: "🥉 Teams Championship 3rd Place (Epsilon)", image: "/Winners/AmrKhaled.jpg", trophies: "0x 🥇 • 0x 🥈 • 1x 🥉", category: "boys" },
      { name: "Noureldin Newer", role: "Teams Championship Bronze", desc: "🥉 Teams Championship 3rd Place (Epsilon)", image: "/Winners/NourEldinNewer.png", trophies: "0x 🥇 • 0x 🥈 • 1x 🥉", category: "boys" },
      { name: "Mazen Ayman", role: "Esports Arena Runner-up", desc: "🥈 Esports Blitz 2026 Runner-up", image: "/Winners/MazenAyman.jpg", trophies: "0x 🥇 • 1x 🥈 • 0x 🥉", category: "boys" }
    ];

    return { sortedPlayers: sorted, championsGallery: winnersList, boysPodium: boysP, girlsPodium: girlsP };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarMap, defaultHistoricalEvents, pastEvents]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tournaments`);
      let combined = [...defaultHistoricalEvents];
      if (res.ok) {
        const data = await res.json();
        const completed = data.filter((t) => t.status === "Completed");

        const completedFormatted = completed.map((t) => {
          const matchingDefault = defaultHistoricalEvents.find(
            (d) => d._id === t._id || d.title.toLowerCase() === t.title.toLowerCase()
          );
          return {
            ...matchingDefault,
            ...t,
            image: t.image || (matchingDefault ? matchingDefault.image : null),
            description: t.description || (matchingDefault ? matchingDefault.description : ""),
            playersList: (t.playersList && t.playersList.length > 0) ? t.playersList : (matchingDefault ? matchingDefault.playersList : [])
          };
        });

        const dbIds = new Set(completedFormatted.map((t) => t._id));
        const dbTitles = new Set(completedFormatted.map((t) => t.title.toLowerCase()));
        const filteredDefault = defaultHistoricalEvents.filter(
          (e) => !dbIds.has(e._id) && !dbTitles.has(e.title.toLowerCase())
        );
        combined = [...completedFormatted, ...filteredDefault];
      }

      combined.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setPastEvents(combined);
    } catch (err) {
      console.error("Failed to fetch events for history:", err);
      setPastEvents(defaultHistoricalEvents);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter events by category and search query
  const filteredEventsList = pastEvents.filter((event) => {
    const matchesCategory =
      categoryFilter === "all" || (event.category || "").toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.playersList &&
        event.playersList.some((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  // Group events by year
  const groupedEvents = {};
  filteredEventsList.forEach((event) => {
    const d = new Date(event.startDate);
    const parsedYear = d && !isNaN(d.getFullYear()) ? d.getFullYear() : null;
    const fallbackYear = event.startDate ? String(event.startDate).substring(0, 4) : "Unknown Year";
    const year = parsedYear || (isNaN(Number(fallbackYear)) ? "Unknown Year" : fallbackYear);

    if (!groupedEvents[year]) {
      groupedEvents[year] = [];
    }
    groupedEvents[year].push(event);
  });

  const years = Object.keys(groupedEvents).sort((a, b) => b - a);

  let globalItemCounter = 0;

  return (
    <div className="history-page">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <main className="history-content">
        {/* Hero Section */}
        <section className="history-hero-section">
          <div className="history-badge">
            <span className="badge-icon">👑</span> ZC Chess Club Archives & Legacy
          </div>
          <h1 className="history-main-title">
            Club History & <span className="gold-gradient-text">Hall of Fame</span>
          </h1>
          <p className="history-subtitle">
            Relive the greatest moments in Zewail City Chess Club history — from high-stakes campus championships and
            Grandmaster simultaneous exhibitions to inter-university triumphs and leadership milestones.
          </p>

          {/* Key Accomplishment Stats Bar */}
          <div className="history-stats-bar">
            <div className="stat-box">
              <div className="stat-icon-wrap">🥇</div>
              <div className="stat-info">
                <span className="stat-number">1st Place</span>
                <span className="stat-label">Inter-Uni Girls (AAST & Nile)</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-wrap">🏆</div>
              <div className="stat-info">
                <span className="stat-number">18+</span>
                <span className="stat-label">Campus Tournaments</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-wrap">👑</div>
              <div className="stat-info">
                <span className="stat-number">2 GM</span>
                <span className="stat-label">Grandmaster Simuls</span>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-wrap">♟</div>
              <div className="stat-info">
                <span className="stat-number">300+</span>
                <span className="stat-label">ZC Competitors</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="history-nav-tabs" aria-label="History Categories">
          <button
            className={`history-tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <span className="tab-icon">🏆</span>
            <span className="tab-text">Tournament Timeline</span>
          </button>
          <button
            className={`history-tab-btn ${activeTab === "halloffame" ? "active" : ""}`}
            onClick={() => setActiveTab("halloffame")}
          >
            <span className="tab-icon">🥇</span>
            <span className="tab-text">Hall of Fame & Winners</span>
          </button>
          <button
            className={`history-tab-btn ${activeTab === "highboard" ? "active" : ""}`}
            onClick={() => setActiveTab("highboard")}
          >
            <span className="tab-icon">👑</span>
            <span className="tab-text">High Board History</span>
          </button>
        </nav>

        {/* ==============================
            TAB 1: TOURNAMENTS & TIMELINE
        ============================== */}
        {activeTab === "events" && (
          <div className="tab-events-view">
            {/* Search & Filter Bar */}
            <div className="history-filter-controls">
              <div className="history-search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search tournaments, winners, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="history-search-input"
                />
                {searchQuery && (
                  <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
                    ✕
                  </button>
                )}
              </div>

              <div className="category-filter-bar">
                <button
                  className={`filter-chip ${categoryFilter === "all" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("all")}
                >
                  🌟 All Events ({pastEvents.length})
                </button>
                <button
                  className={`filter-chip ${categoryFilter === "tournament" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("tournament")}
                >
                  🏆 Tournaments
                </button>
                <button
                  className={`filter-chip ${categoryFilter === "exhibition" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("exhibition")}
                >
                  👑 GM Exhibitions
                </button>
                <button
                  className={`filter-chip ${categoryFilter === "training" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("training")}
                >
                  🎓 Tactics & Arenas
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="history-loading-container">
                <div className="spinner-ring"></div>
                <span>Loading Club Archives...</span>
              </div>
            ) : years.length === 0 ? (
              <div className="history-empty-state">
                <span className="empty-icon">♟️</span>
                <h3>No tournaments found</h3>
                <p>Try clearing your search query or switching the category filter.</p>
                <button
                  className="reset-filter-btn"
                  onClick={() => {
                    setCategoryFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {years.length > 1 && (
                  <div className="timeline-year-jump-bar">
                    <span className="year-jump-label">Jump to Season:</span>
                    <div className="year-jump-pills">
                      {years.map((yr) => (
                        <button
                          key={yr}
                          className="year-jump-pill"
                          onClick={() => {
                            const el = document.getElementById(`season-${yr.replace(/[^a-zA-Z0-9]/g, "-")}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          📅 {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="timeline-container">
                  {years.map((year, yearIndex) => (
                    <div
                      key={yearIndex}
                      id={`season-${year.replace(/[^a-zA-Z0-9]/g, "-")}`}
                      className="timeline-year-section"
                    >
                      <div className="timeline-year-marker">
                        <div className="year-badge">
                          <span>📅</span> Season {year}
                        </div>
                      </div>

                      <div className="timeline-events-grid">
                      {groupedEvents[year].map((event, eventIndex) => {
                        const isLeft = globalItemCounter % 2 === 0;
                        globalItemCounter++;

                        return (
                          <ScrollReveal key={event._id || eventIndex}>
                            <div className={`timeline-item ${isLeft ? "left" : "right"}`}>
                              <div className="timeline-dot">
                                <div className="dot-inner"></div>
                              </div>
                              <article
                                className="timeline-card glass-panel"
                                onClick={() => setSelectedEventModal(event)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && setSelectedEventModal(event)}
                              >
                                <div
                                  className={`card-image-banner ${
                                    !getImageUrl(event.image) ? "fallback-banner" : ""
                                  }`}
                                >
                                  {getImageUrl(event.image) && (
                                    <img
                                      src={getImageUrl(event.image)}
                                      alt={event.title}
                                      loading="lazy"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.parentNode.classList.add("fallback-banner");
                                        e.target.style.display = "none";
                                      }}
                                    />
                                  )}
                                  <div className="banner-overlay-badge">{event.type}</div>
                                </div>

                                <div className="card-body-content">
                                  <div className="card-header-group">
                                    <h3 className="card-event-title">{event.title}</h3>
                                    <div className="card-meta-tags">
                                      <span className="card-tag-date">
                                        <span className="meta-icon">📅</span> {event.startDate}
                                      </span>
                                      <span className="card-tag-location">
                                        <span className="meta-icon">📍</span> {event.location}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="card-event-desc">
                                    {event.description ||
                                      "An exciting competitive event hosted by Zewail City Chess Club bringing together campus tacticians."}
                                  </p>

                                  {/* Highlight Winners Chips with Photos */}
                                  {event.playersList && event.playersList.length > 0 && (
                                    <div className="card-highlights-section">
                                      <span className="highlights-title">TOP PODIUM & HIGHLIGHTS</span>
                                      <div className="highlights-tags-list">
                                        {event.playersList.slice(0, 4).map((p, i) => {
                                          const h = parseHighlight(p.name);
                                          
                                          const names = h.name ? h.name.split(',').map(n => n.trim().replace(/\(.*\)/, "").trim()) : [];
                                          const isTeamEvent = (event.type || "").toLowerCase().includes("team");
                                          const teamMatch = h.role ? h.role.match(/\((.*?)\)/) : null;
                                          const potentialTeam = teamMatch ? teamMatch[1] : null;
                                          const teamName = potentialTeam && (isTeamEvent || avatarMap[potentialTeam]) ? potentialTeam : null;
                                          const teamLogo = teamName && avatarMap[teamName] ? avatarMap[teamName] : null;
                                          const isTeam = isTeamEvent || (names.length > 1 && Boolean(teamName));
                                          
                                          const singleAvatar = avatarMap[h.name];
                                          
                                          const tagClass =
                                            h.emoji === "🥇"
                                              ? "medal-gold"
                                              : h.emoji === "🥈"
                                              ? "medal-silver"
                                              : h.emoji === "🥉"
                                              ? "medal-bronze"
                                              : "";

                                          return (
                                            <span key={i} className={`timeline-highlight-tag ${tagClass}`}>
                                              <span className="tag-emoji">{h.emoji}</span>
                                              
                                              {teamLogo && (
                                                <img src={teamLogo} alt={teamName} className="timeline-highlight-avatar team-logo-avatar" onError={handleImageError} title={teamName} style={{borderRadius: '4px', marginRight: '4px'}} />
                                              )}
                                              
                                              {isTeam && names.length > 1 ? names.map((n, idx) => {
                                                const uAvatar = avatarMap[n];
                                                return uAvatar ? (
                                                  <img key={idx} src={uAvatar} alt={n} className="timeline-highlight-avatar" onError={handleImageError} title={n} />
                                                ) : null;
                                              }) : (singleAvatar && (
                                                <img src={singleAvatar} alt={h.name} className="timeline-highlight-avatar" onError={handleImageError} />
                                              ))}

                                              <span className="highlight-text">
                                                {h.role && <span className="highlight-role">{h.role}: </span>}
                                                <strong className="highlight-name">{h.name}</strong>
                                              </span>
                                            </span>
                                          );
                                        })}
                                        {event.playersList.length > 4 && (
                                          <span className="more-tag">+{event.playersList.length - 4} more</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="view-details-prompt">
                                    <span>Explore Full Details & Photo</span>
                                    <span className="arrow-icon">→</span>
                                  </div>
                                </div>
                              </article>
                            </div>
                          </ScrollReveal>
                        );
                      })}
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==============================
            TAB 2: HALL OF FAME & WINNERS
        ============================== */}
        {activeTab === "halloffame" && (
          <div className="hall-of-fame-container">

            {/* Podium Category Toggle Bar */}
            <div className="podium-toggle-bar">
              <button
                className={`podium-toggle-btn ${podiumCategory === "both" ? "active" : ""}`}
                onClick={() => setPodiumCategory("both")}
              >
                🌟 View Both Podiums
              </button>
              <button
                className={`podium-toggle-btn girls-btn ${podiumCategory === "girls" ? "active" : ""}`}
                onClick={() => setPodiumCategory("girls")}
              >
                👑 Girls Champions Podium
              </button>
              <button
                className={`podium-toggle-btn boys-btn ${podiumCategory === "boys" ? "active" : ""}`}
                onClick={() => setPodiumCategory("boys")}
              >
                🏆 Boys Champions Podium
              </button>
            </div>

            {/* 👑 GIRLS PODIUM */}
            {(podiumCategory === "girls" || podiumCategory === "both") && (
              <ScrollReveal>
                <div className="champions-podium-card glass-panel girls-podium-card">
                  <div className="podium-header">
                    <div className="podium-trophy-badge girls-badge">👑 GIRLS CHAMPIONSHIP PODIUM</div>
                    <h2 className="podium-title girls-title">ZC Women's & Inter-University Champions</h2>
                    <p className="podium-subtitle">
                      Celebrating our female champions leading Zewail City in university championships and executive leadership
                    </p>
                  </div>

                  <div className="podium-grid">
                    {/* 🥈 2nd Place Silver */}
                    <div className="podium-place silver" onClick={() => openPlayerModal(girlsPodium.silver.name, { avatar: girlsPodium.silver.avatar, role: girlsPodium.silver.badge })} style={{ cursor: "pointer" }}>
                      <div className="podium-rank-ribbon">2nd Place</div>
                      <div className="podium-avatar-wrapper silver-border">
                        <img
                          src={girlsPodium.silver.avatar}
                          alt={girlsPodium.silver.name}
                          className="podium-avatar"
                          onError={handleImageError}
                        />
                        <span className="podium-medal">🥈</span>
                      </div>
                      <h3 className="podium-winner-name">{girlsPodium.silver.name}</h3>
                      <span className="podium-winner-badge silver-bg">{girlsPodium.silver.badge}</span>
                      <p className="podium-event-name">{girlsPodium.silver.stats}</p>
                    </div>

                    {/* 🥇 1st Place Gold */}
                    <div className="podium-place gold" onClick={() => openPlayerModal(girlsPodium.gold.name, { avatar: girlsPodium.gold.avatar, role: girlsPodium.gold.badge })} style={{ cursor: "pointer" }}>
                      <div className="podium-crown-wrapper">
                        <span className="podium-crown">👑</span>
                      </div>
                      <div className="podium-rank-ribbon gold-ribbon">Grand Champion</div>
                      <div className="podium-avatar-wrapper gold-border">
                        <img
                          src={girlsPodium.gold.avatar}
                          alt={girlsPodium.gold.name}
                          className="podium-avatar"
                          onError={handleImageError}
                        />
                        <span className="podium-medal gold-medal">🥇</span>
                      </div>
                      <h3 className="podium-winner-name gold-name">{girlsPodium.gold.name}</h3>
                      <span className="podium-winner-badge gold-bg">{girlsPodium.gold.badge}</span>
                      <p className="podium-event-name">{girlsPodium.gold.stats}</p>
                    </div>

                    {/* 🥉 3rd Place Bronze */}
                    <div className="podium-place bronze" onClick={() => openPlayerModal(girlsPodium.bronze.name, { avatar: girlsPodium.bronze.avatar, role: girlsPodium.bronze.badge })} style={{ cursor: "pointer" }}>
                      <div className="podium-rank-ribbon">3rd Place</div>
                      <div className="podium-avatar-wrapper bronze-border">
                        <img
                          src={girlsPodium.bronze.avatar}
                          alt={girlsPodium.bronze.name}
                          className="podium-avatar"
                          onError={handleImageError}
                        />
                        <span className="podium-medal">🥉</span>
                      </div>
                      <h3 className="podium-winner-name">{girlsPodium.bronze.name}</h3>
                      <span className="podium-winner-badge bronze-bg">{girlsPodium.bronze.badge}</span>
                      <p className="podium-event-name">{girlsPodium.bronze.stats}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* 🏆 BOYS / OPEN PODIUM */}
            {(podiumCategory === "boys" || podiumCategory === "both") && (
              <ScrollReveal>
                <div className="champions-podium-card glass-panel boys-podium-card">
                  <div className="podium-header">
                    <div className="podium-trophy-badge boys-badge">🏆 BOYS / OPEN CHAMPIONSHIP PODIUM</div>
                    <h2 className="podium-title">ZC Open Tournament Champions</h2>
                    <p className="podium-subtitle">
                      Honoring our top campus tournament champions and Swiss & Knockout masters
                    </p>
                  </div>

                  <div className="podium-grid">
                    {/* 🥈 2nd Place Silver — 3-way Tie */}
                    <div className="podium-place silver">
                      <div className="podium-rank-ribbon">🥈 Tied 2nd Place</div>

                      {/* Overlapping avatar cluster */}
                      <div className="podium-tied-avatars">
                        {boysPodium.silver.tied.map((tp, ti) => (
                          <div
                            key={ti}
                            className="podium-tied-avatar-wrap"
                            style={{ zIndex: boysPodium.silver.tied.length - ti }}
                            onClick={() => openPlayerModal(tp.name, { avatar: tp.avatar, role: tp.badge })}
                            title={tp.name}
                          >
                            <img
                              src={tp.avatar}
                              alt={tp.name}
                              className="podium-avatar podium-tied-img"
                              onError={handleImageError}
                            />
                          </div>
                        ))}
                        <span className="podium-medal">🥈</span>
                      </div>

                      {/* Clickable names list */}
                      <div className="podium-tied-names">
                        {boysPodium.silver.tied.map((tp, ti) => (
                          <span
                            key={ti}
                            className="podium-tied-name-btn"
                            onClick={() => openPlayerModal(tp.name, { avatar: tp.avatar, role: tp.badge })}
                          >
                            {tp.name}
                          </span>
                        ))}
                      </div>

                      <span className="podium-winner-badge silver-bg">{boysPodium.silver.badge}</span>
                      <p className="podium-event-name">{boysPodium.silver.stats}</p>
                    </div>

                    {/* 🥇 1st Place Gold */}
                    <div className="podium-place gold" onClick={() => openPlayerModal(boysPodium.gold.name, { avatar: boysPodium.gold.avatar, role: boysPodium.gold.badge })} style={{ cursor: "pointer" }}>
                      <div className="podium-crown-wrapper">
                        <span className="podium-crown">👑</span>
                      </div>
                      <div className="podium-rank-ribbon gold-ribbon">Grand Champion</div>
                      <div className="podium-avatar-wrapper gold-border">
                        <img
                          src={boysPodium.gold.avatar}
                          alt={boysPodium.gold.name}
                          className="podium-avatar"
                          onError={handleImageError}
                        />
                        <span className="podium-medal gold-medal">🥇</span>
                      </div>
                      <h3 className="podium-winner-name gold-name">{boysPodium.gold.name}</h3>
                      <span className="podium-winner-badge gold-bg">{boysPodium.gold.badge}</span>
                      <p className="podium-event-name">{boysPodium.gold.stats}</p>
                    </div>

                    {/* 🥉 3rd Place Bronze */}
                    <div className="podium-place bronze" onClick={() => openPlayerModal(boysPodium.bronze.name, { avatar: boysPodium.bronze.avatar, role: boysPodium.bronze.badge })} style={{ cursor: "pointer" }}>
                      <div className="podium-rank-ribbon">3rd Place</div>
                      <div className="podium-avatar-wrapper bronze-border">
                        <img
                          src={boysPodium.bronze.avatar}
                          alt={boysPodium.bronze.name}
                          className="podium-avatar"
                          onError={handleImageError}
                        />
                        <span className="podium-medal">🥉</span>
                      </div>
                      <h3 className="podium-winner-name">{boysPodium.bronze.name}</h3>
                      <span className="podium-winner-badge bronze-bg">{boysPodium.bronze.badge}</span>
                      <p className="podium-event-name">{boysPodium.bronze.stats}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Champions Gallery: Features all key winners from the /Winners directory */}
            <div className="champions-gallery-section">
              <div className="section-head-banner">
                <span className="section-subtitle">COMMUNITY ACCOMPLISHMENTS</span>
                <h2 className="section-title">🏆 ZC Chess Club Champions & Grand Finalists</h2>
                <p className="section-desc">
                  Meet the champions who conquered campus tournaments, represented Zewail City across universities, and led our training programs.
                </p>
              </div>

              <div className="champions-cards-grid">
                {championsGallery.map((champ, cIdx) => (
                  <ScrollReveal key={cIdx}>
                    <div 
                      className="champion-profile-card glass-panel"
                      onClick={() => openPlayerModal(champ.name, { avatar: champ.image, role: champ.role, desc: champ.desc })}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="champion-card-top">
                        <div className="champion-avatar-box">
                          <img
                            src={champ.image}
                            alt={champ.name}
                            className="champion-photo"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="champion-trophy-badge">{champ.trophies}</div>
                      </div>
                      <div className="champion-card-body">
                        <h3 className="champion-name">{champ.name}</h3>
                        <span className="champion-role-tag">{champ.role}</span>
                        <p className="champion-desc">{champ.desc}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>


          </div>
        )}

        {/* ==============================
            TAB 3: HIGH BOARD HISTORY
        ============================== */}
        {activeTab === "highboard" && (
          <div className="board-history-container">
            <div className="section-head-banner" style={{ textAlign: "center", marginBottom: "30px" }}>
              <span className="section-subtitle">EXECUTIVE LEADERSHIP</span>
              <h2 className="section-title">👑 High Board History Through The Years</h2>
              <p className="section-desc" style={{ maxWidth: "680px", margin: "0 auto" }}>
                Honoring the presidents, vice presidents, and board directors who built and shaped the ZC Chess Club community.
              </p>
            </div>

            {/* High Board Year Quick-Nav Pills */}
            <div className="board-year-nav-bar">
              <button
                className={`board-year-nav-btn ${highboardYearFilter === "all" ? "active" : ""}`}
                onClick={() => setHighboardYearFilter("all")}
              >
                🌟 All Terms
              </button>
              {highboardHistory.map((b) => (
                <button
                  key={b.year}
                  className={`board-year-nav-btn ${highboardYearFilter === b.year ? "active" : ""} ${b.isCurrent ? "current-year-btn" : ""}`}
                  onClick={() => setHighboardYearFilter(b.year)}
                >
                  {b.isCurrent ? `✨ ${b.year}` : b.year}
                </button>
              ))}
            </div>

            {highboardHistory
              .filter((board) => highboardYearFilter === "all" || board.year === highboardYearFilter)
              .map((board, index) => (
                <ScrollReveal key={index}>
                  <section className="board-year-section glass-panel">
                    <div className="board-year-header">
                      <div className="board-year-title-group">
                        <h2 className="board-year-title">
                          🎓 Academic Year {board.year}
                        </h2>
                        <span className="board-members-count">
                          {board.members.filter((m) => m.name.toLowerCase() !== "unknown").length} Board Members
                        </span>
                      </div>
                      {board.isCurrent && <span className="current-badge">✨ Current Administration</span>}
                    </div>

                    <div className="board-members-grid-custom">
                      {board.members.map((member, idx) => {
                        const isPresident = member.role.toLowerCase().includes("president") && !member.role.toLowerCase().includes("vice");
                        const isVP = member.role.toLowerCase().includes("vice president");

                        return (
                          <div
                            key={idx}
                            className={`board-member-card glass-panel ${isPresident ? "president-card" : isVP ? "vp-card" : ""}`}
                            onClick={() => openPlayerModal(member.name, { avatar: member.image, role: member.role, major: member.major, batch: member.batch })}
                            style={{ "--delay": `${idx * 0.06}s`, cursor: member.name.toLowerCase() !== "unknown" ? "pointer" : "default" }}
                          >
                            <div className={`member-avatar-container ${isPresident ? "president-ring" : isVP ? "vp-ring" : ""}`}>
                              <img
                                src={getImageUrl(member.image || avatarMap[member.name])}
                                alt={member.name}
                                className="board-member-avatar"
                                onError={handleImageError}
                              />
                            </div>
                            <div className="board-member-info">
                              <h3 className="board-member-name">{member.name}</h3>
                              
                              <span className={`board-member-role ${isPresident ? "president-role" : isVP ? "vp-role" : ""}`}>
                                {isPresident ? "👑 " : isVP ? "⭐ " : ""}{member.role}
                              </span>

                              {(member.major || member.batch) && member.name.toLowerCase() !== "unknown" && (
                                <div className="board-member-meta-tags">
                                  {member.major && (
                                    <span className="board-member-major-tag">
                                      🎓 {member.major}
                                    </span>
                                  )}
                                  {member.batch && (
                                    <span className="board-member-batch-tag">
                                      🗓️ Batch {member.batch}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </ScrollReveal>
              ))}
          </div>
        )}

        {/* ==============================
            EVENT DETAIL MODAL
        ============================== */}
        {selectedEventModal && (
          <div className="event-modal-overlay" onClick={() => setSelectedEventModal(null)}>
            <div className="event-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedEventModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>

              {getImageUrl(selectedEventModal.image) && (
                <div className="modal-banner">
                  <img
                    src={getImageUrl(selectedEventModal.image)}
                    alt={selectedEventModal.title}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="modal-content-body">
                <span className="modal-type-tag">{selectedEventModal.type}</span>
                <h2 className="modal-title">{selectedEventModal.title}</h2>
                <div className="modal-meta-row">
                  <span>📅 {selectedEventModal.startDate}</span>
                  <span>📍 {selectedEventModal.location}</span>
                </div>

                <p className="modal-desc">{selectedEventModal.description}</p>

                {selectedEventModal.playersList && selectedEventModal.playersList.length > 0 && (() => {
                  const placements = [];
                  const participants = [];
                  selectedEventModal.playersList.forEach((p) => {
                    const h = parseHighlight(p.name);
                    if (h.emoji.match(/(🥇|🥈|🥉|🏅|🏆)/)) {
                      placements.push(h);
                    } else {
                      participants.push(h);
                    }
                  });

                  return (
                    <>
                      {placements.length > 0 && (
                        <div className="modal-winners-section">
                          <h4>🏆 Tournament Winners & Podium</h4>
                          <div className="modal-winners-grid">
                            {placements.map((h, pIdx) => {
                              const medalClass =
                                h.emoji === "🥇"
                                  ? "medal-gold"
                                  : h.emoji === "🥈"
                                  ? "medal-silver"
                                  : h.emoji === "🥉"
                                  ? "medal-bronze"
                                  : "medal-cup";

                              const names = h.name
                                ? h.name.split(",").map((n) => n.trim().replace(/\(.*\)/, "").trim()).filter(Boolean)
                                : [];
                              const isTeamEvent = (selectedEventModal.type || "").toLowerCase().includes("team");
                              const teamMatch = h.role ? h.role.match(/\((.*?)\)/) : null;
                              const potentialTeam = teamMatch ? teamMatch[1] : null;
                              const teamName = potentialTeam && (isTeamEvent || avatarMap[potentialTeam]) ? potentialTeam : null;
                              const teamLogo = teamName && avatarMap[teamName] ? avatarMap[teamName] : null;
                              const singleAvatar = avatarMap[h.name];
                              const isTeam = isTeamEvent || (names.length > 1 && Boolean(teamName));

                              return (
                                <div key={pIdx} className={`modal-winner-card ${medalClass} ${isTeam ? "modal-winner-team-card" : ""}`}>
                                  <div className="modal-winner-avatar-wrapper">
                                    <img
                                      src={isTeam && teamLogo ? teamLogo : singleAvatar || "/Icons/unknown.png"}
                                      alt={teamName || h.name}
                                      className={`modal-winner-avatar ${isTeam ? "modal-team-avatar" : ""}`}
                                      onError={handleImageError}
                                      style={isTeam ? { borderRadius: "8px" } : {}}
                                    />
                                    <span className="modal-winner-medal-badge">{h.emoji}</span>
                                  </div>
                                  <div className="modal-winner-info">
                                    {h.role && <span className="modal-winner-role">{h.role}</span>}
                                    {isTeam && teamName && <h4 className="modal-winner-name">{teamName}</h4>}
                                    {!isTeam && <h4 className="modal-winner-name">{h.name}</h4>}

                                    {isTeam && names.length > 0 && (
                                      <div
                                        className="modal-team-members-list"
                                        style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "6px",
                                          marginTop: "6px"
                                        }}
                                      >
                                        {names.map((memberName, mIdx) => {
                                          const memberAvatar = avatarMap[memberName] || "/Icons/unknown.png";
                                          return (
                                            <div
                                              key={mIdx}
                                              className="modal-team-member-chip"
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                background: "rgba(255, 255, 255, 0.07)",
                                                padding: "3px 8px 3px 4px",
                                                borderRadius: "14px",
                                                fontSize: "0.76rem"
                                              }}
                                            >
                                              <img
                                                src={memberAvatar}
                                                alt={memberName}
                                                onError={handleImageError}
                                                style={{
                                                  width: "18px",
                                                  height: "18px",
                                                  borderRadius: "50%",
                                                  objectFit: "cover"
                                                }}
                                              />
                                              <span style={{ color: "#f0f0f0", fontWeight: "600" }}>{memberName}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {participants.length > 0 && (
                        <div className="modal-winners-section" style={{ borderTop: "none", paddingTop: 0 }}>
                          <h4>📋 Highlights & Tournament Information</h4>
                          <div className="modal-tags-grid">
                            {participants.map((h, pIdx) => (
                              <div key={pIdx} className="modal-participant-chip">
                                <span>{h.emoji}</span>
                                <span className="highlight-name">{h.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="modal-footer-actions">
                  <a
                    href={
                      selectedEventModal.link ||
                      selectedEventModal.instagramUrl ||
                      selectedEventModal.url ||
                      "https://www.instagram.com/zc.chessclub/"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-instagram-btn"
                  >
                    📷 View Post on Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Profile Trading Card Modal */}
        {selectedPlayerModal && (
          <div
            className="event-modal-overlay active"
            onClick={() => setSelectedPlayerModal(null)}
            role="dialog"
            aria-modal="true"
          >
            <div className="event-modal-content trading-card-modal glass-panel" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedPlayerModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>

              <div className="trading-card-inner">
                <div className="tc-image-section">
                  <img
                    src={getImageUrl(selectedPlayerModal.avatar)}
                    alt={selectedPlayerModal.name}
                    className="tc-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/Icons/unknown.png";
                    }}
                  />
                  <div className="tc-score-badge">
                    <span className="tc-score-val">{selectedPlayerModal.score}</span>
                    <span className="tc-score-lbl">Total Score</span>
                  </div>
                </div>

                <div className="tc-info-section">
                  <h2 className="tc-name">{selectedPlayerModal.name}</h2>

                  {selectedPlayerModal.role && (
                    <div style={{ textAlign: "center", marginBottom: "12px" }}>
                      <span className="champion-role-tag">{selectedPlayerModal.role}</span>
                    </div>
                  )}

                  {(selectedPlayerModal.major || selectedPlayerModal.batch) && (
                    <div className="board-member-meta-tags" style={{ justifyContent: "center", marginBottom: "14px" }}>
                      {selectedPlayerModal.major && (
                        <span className="board-member-major-tag">🎓 {selectedPlayerModal.major}</span>
                      )}
                      {selectedPlayerModal.batch && (
                        <span className="board-member-batch-tag">📅 Batch {selectedPlayerModal.batch}</span>
                      )}
                    </div>
                  )}

                  {selectedPlayerModal.desc && (
                    <p className="champion-desc" style={{ textAlign: "center", marginBottom: "18px" }}>
                      {selectedPlayerModal.desc}
                    </p>
                  )}

                  <div className="tc-medals-row">
                    <div className="tc-medal">
                      <span className="tc-medal-icon">🥇</span>
                      <span className="tc-medal-count">{selectedPlayerModal.gold}</span>
                      <span className="tc-medal-lbl">Gold</span>
                    </div>
                    <div className="tc-medal">
                      <span className="tc-medal-icon">🥈</span>
                      <span className="tc-medal-count">{selectedPlayerModal.silver}</span>
                      <span className="tc-medal-lbl">Silver</span>
                    </div>
                    <div className="tc-medal">
                      <span className="tc-medal-icon">🥉</span>
                      <span className="tc-medal-count">{selectedPlayerModal.bronze}</span>
                      <span className="tc-medal-lbl">Bronze</span>
                    </div>
                  </div>

                  <div className="tc-titles-section">
                    <h4>🏆 Championship Titles & Honors</h4>
                    {selectedPlayerModal.titles && selectedPlayerModal.titles.length > 0 ? (
                      <ul className="tc-titles-list">
                        {selectedPlayerModal.titles.map((title, i) => (
                          <li key={i}>{title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tc-no-titles">No major 1st place titles yet.</p>
                    )}
                  </div>

                  <div className="tc-modal-actions">
                    <button
                      className="tc-view-timeline-btn"
                      onClick={() => {
                        const pName = selectedPlayerModal.name;
                        setSelectedPlayerModal(null);
                        setActiveTab("events");
                        setSearchQuery(pName);
                        setTimeout(() => {
                          const el = document.querySelector(".tab-events-view");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }, 80);
                      }}
                    >
                      🔍 View All Tournaments by {selectedPlayerModal.name.split(" ")[0]} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

