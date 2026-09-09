(function () {
      'use strict';
      const toggle = document.querySelector('.study-nav-toggle');
      const nav = document.querySelector('.study-nav-list');
      if (toggle && nav) toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });

      const back = document.getElementById('studyBackTop');
      if (back) {
        window.addEventListener('scroll', () => back.classList.toggle('show', window.scrollY > 500), {passive: true});
        back.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
      }

      const search = document.getElementById('studySearch');
      const side = document.getElementById('studySideNav');
      const chapters = [
        ["01", "lidar", "LiDAR — Complete Foundation"], ["02", "lidar-components", "LiDAR Components & Data"],
        ["03", "bim", "BIM — LOD 400 & 500"], ["04", "gis", "QGIS, ArcGIS Pro & ArcMap"],
        ["05", "photo", "Photogrammetry"], ["06", "annotation", "Data Annotation"],
        ["07", "lidar-annotation", "LiDAR Annotation"], ["08", "powerline", "PowerLine Classification"],
        ["09", "topology", "Topology"], ["10", "scan", "Scan to GIS / Scan to BIM"],
        ["11", "cad", "CAD to BIM / 2D & 3D CAD"], ["12", "software", "TerraSolid & LAStools"],
        ["13", "software-map", "Free vs Paid LiDAR/GIS Software"], ["14", "terrain", "DTM / DSM / DEM / TIN / Contours"],
        ["15", "global", "Why Global Mapper Matters"], ["16", "gcp", "GCP — Ground Control Points"],
        ["17", "metashape", "Pixel3D / Get3D View / Agisoft Metashape"], ["18", "advanced", "Advanced Classification"],
        ["19", "aiml", "AI/ML in GIS & Annotation"], ["20", "python", "Python & Pandas for GIS/LiDAR"],
        ["21", "arcpy", "ArcPy vs PyQGIS"], ["22", "workflow", "Complete Learning Workflow"],
        ["23", "revision", "Quick Revision"], ["24", "quiz", "Self-Test"], ["25", "gis-software-master", "GIS Software — Complete 20,000+ Word Guide"]
      ];
      function renderNav() {
        const q = (search.value || '').toLowerCase();
        side.innerHTML = '';
        chapters.filter(c => c[2].toLowerCase().includes(q)).forEach(c => {
          const a = document.createElement('a');
          a.className = 'study-side-link'; a.href = '#' + c[1];
          a.innerHTML = '<span class="side-num">' + c[0] + '</span>' + c[2];
          side.appendChild(a);
        });
      }
      search.addEventListener('input', renderNav); renderNav();

      const progress = document.getElementById('studyProgress');
      const seen = new Set();
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {if (e.isIntersecting) seen.add(e.target.id)});
        progress.style.width = Math.min(100, Math.round(seen.size / 25 * 100)) + '%';
      }, {threshold: .12});
      setTimeout(() => document.querySelectorAll('.section').forEach(s => io.observe(s)), 1000);
    })();
