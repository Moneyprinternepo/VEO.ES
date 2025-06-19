document.addEventListener('DOMContentLoaded', function() {
    // Selectores del DOM (sin cambios)
    const appContainer = document.getElementById('app-container');
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('[data-page]');
    const heroSliderElement = document.querySelector('.hero-slider');
    const heroDotsContainer = document.querySelector('.hero .slider-dots');
    const liveNowTextElement = document.getElementById('live-now-text');
    const timelineWrapper = document.getElementById('timeline-wrapper');
    const timeMarkersHomeContainer = document.getElementById('time-markers-v2-home');
    const programBlocksHomeContainer = document.getElementById('program-blocks-v2-home');
    const timelineElementHome = document.getElementById('timeline-v2');
    const fictionGridContainer = document.getElementById('fiction-grid-container');
    const dayTabsFullContainer = document.getElementById('day-tabs-full');
    const scheduleListVerticalContainer = document.getElementById('schedule-list-v3');

    // Variables de estado (sin cambios)
    let currentHeroSlide = 0;
    let heroAutoSlideInterval;

    // --- DATOS DEL HERO INCRUSTADOS DIRECTAMENTE ---
    // Reemplaza esto con tus datos reales del hero.csv
    const datosHeroIncrustados = [
      {
        "id": "vidas-criminales",
        "tag": "Miércoles 18 - 22:30",
        "title": "Vidas Criminales",
        "bio": "Dos delincuentes comunes obtienen más de lo que esperaban después de secuestrar a la esposa de un desarrollador inmobiliario corrupto que no muestra interés en pagar el rescate de 1 millón de dólares por su regreso seguro.",
        "type": "Cine",
        "duration": "1h 38m",
        "genre": "Comedia/Crimen",
        "imdbLink": "https://www.imdb.com/es-es/title/tt1663207/",
        "imageUrl": "https://i.ibb.co/C5t6pfb6/2.jpg", // URL de tu hero.csv
        "gradientColors": ["rgba(16, 16, 16, 0.9) 20%", "rgba(16, 16, 16, 0.1) 70%"], // Asegúrate que esto sea un array
        "ctaPage": "schedule"
      },
      {
        "id": "pixie",
        "tag": "Miércoles 18 - 20:30",
        "title": "Pixie",
        "bio": "Para vengar la muerte de su madre, Pixie planea un atraco, pero debe huir a través de Irlanda de los gánsteres, enfrentarse al patriarcado y elegir su propio destino.",
        "type": "Cine",
        "duration": "1h 33m",
        "genre": "Comedia Negra",
        "imdbLink": "https://www.imdb.com/es-es/title/tt10831086/",
        "imageUrl": "https://i.ibb.co/h1JgQwF7/1.jpg", // URL de tu hero.csv
        "gradientColors": ["rgba(16, 16, 16, 0.9) 20%", "rgba(16, 16, 16, 0.1) 70%"],
        "ctaPage": "schedule"
      },
      {
        "id": "crimenes-del-futuro",
        "tag": "Domingo 22- 23:50",
        "title": "Crímenes del futuro",
        "bio": "La especie humana evoluciona y se adapta a un entorno sintético, el cuerpo es sometido a nuevas transformaciones y mutaciones. El artista Saul exhibe las metamorfósis de sus órganos en performances de vanguardia.",
        "type": "Cine",
        "duration": "1h 47m",
        "genre": "Sci-Fi/Horror",
        "imdbLink": "https://www.imdb.com/es-es/title/tt14549466/",
        "imageUrl": "https://i.ibb.co/KpMXNkz3/3.jpg", // URL de tu hero.csv
        "gradientColors": ["rgba(16, 16, 16, 0.9) 20%", "rgba(16, 16, 16, 0.1) 70%"],
        "ctaPage": "schedule"
      },
      {
        "id": "plan-a",
        "tag": "Jueves 19 - 23:45",
        "title": "Plan A",
        "bio": "En 1945, un grupo de sobrevivientes judíos del Holocausto planeó envenenar el sistema de agua en Alemania. La película narra la peligrosa y atrevida operación encubierta que se llamó Plan A.",
        "type": "Cine",
        "duration": "1h 49m",
        "genre": "Drama histórico",
        "imdbLink": "https://www.imdb.com/es-es/title/tt5448338/",
        "imageUrl": "https://i.ibb.co/tMVXFxJ2/4.jpg", // URL de tu hero.csv
        "gradientColors": ["rgba(16, 16, 16, 0.9) 20%", "rgba(16, 16, 16, 0.1) 70%"],
        "ctaPage": "schedule"
      }
    ];

    // --- FUNCIÓN DE PARSEO DE CSV (la dejamos por si otros CSV siguen usándose) ---
    function parseCSV(csvText, delimiter = ';') {
        // ... (código de parseCSV como estaba antes)
        if (!csvText || typeof csvText !== 'string' || csvText.trim() === "") {
            console.warn("parseCSV recibió texto vacío, nulo o no es string:", csvText);
            return [];
        }
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return [];
        const firstLineTrimmed = lines[0].trim();
        if (firstLineTrimmed === "") {
            console.warn("La línea de cabecera del CSV está vacía.");
            return [];
        }
        const headers = firstLineTrimmed.split(delimiter).map(header => header.trim().toLowerCase());
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === "") continue;
            const values = line.split(delimiter);
            const entry = {};
            headers.forEach((header, index) => {
                let value = values[index] || ""; 
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1).replace(/""/g, '"');
                }
                entry[header] = value.trim();
            });
            data.push(entry);
        }
        return data;
    }

    async function fetchCSV(filePath, delimiter = ';') {
        // ... (código de fetchCSV como estaba antes)
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                if (window.location.protocol === 'file:' && response.status === 0) {
                     throw new Error(`Error de red (probablemente CORS) al cargar ${filePath} en modo file://. Necesitas un servidor local.`);
                }
                throw new Error(`Error al cargar ${filePath}: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            return parseCSV(csvText, delimiter);
        } catch (error) {
            console.error(`Fallo al obtener o parsear ${filePath}:`, error.message);
            // ... (manejo de error en UI como estaba)
            if (window.location.protocol === 'file:' && appContainer) {
                const errorMsgEl = appContainer.querySelector('.fetch-error-message[data-file="' + filePath + '"]');
                if (!errorMsgEl) {
                    const errorMsg = document.createElement('p');
                    errorMsg.className = 'fetch-error-message';
                    errorMsg.setAttribute('data-file', filePath);
                    // ... (estilos del mensaje de error)
                    errorMsg.style.color = 'red';
                    errorMsg.style.backgroundColor = 'rgba(255,230,230,0.9)';
                    errorMsg.style.border = '1px solid red';
                    errorMsg.style.padding = '10px';
                    errorMsg.style.margin = '10px auto';
                    errorMsg.style.textAlign = 'center';
                    errorMsg.innerHTML = `<strong>Error al cargar datos desde ${filePath}:</strong> ${error.message}<br>Por favor, usa un servidor local para ver la página correctamente.`;
                    
                    const homePage = document.getElementById('home');
                    if(homePage && homePage.classList.contains('active') && homePage.firstChild) {
                        homePage.insertBefore(errorMsg, homePage.firstChild);
                    } else if (appContainer.firstChild) {
                        appContainer.insertBefore(errorMsg, appContainer.firstChild);
                    } else {
                        appContainer.appendChild(errorMsg);
                    }
                }
            }
            return []; 
        }
    }

    // --- FUNCIONES DE TRANSFORMACIÓN DE DATOS CSV ---
    // Ya NO NECESITAMOS transformarDatosHero si los datos están incrustados en el formato correcto
    // function transformarDatosHero(csvData) { ... } // Se puede eliminar o comentar

    function transformarDatosEstaNoche(csvData) {
        // ... (como estaba)
        if (!csvData || csvData.length === 0) {
            return { prefijo: "Esta Noche", programas: [] };
        }
        return {
            prefijo: csvData[0].prefijo, 
            programas: csvData.map(item => ({
                titulo: item.titulo, 
                hora: item.hora     
            }))
        };
    }

    function transformarDatosParrilla(csvData) {
        // ... (como estaba)
        const programacion = {};
        const diasSet = new Set();
        csvData.forEach(item => {
            if (!item.diakey || !item.start || !item.duration || !item.title) {
                return;
            }
            const dia = item.diakey; 
            if (!programacion[dia]) {
                programacion[dia] = [];
            }
            diasSet.add(dia);
            programacion[dia].push({
                start: item.start,
                duration: parseInt(item.duration, 10), 
                title: item.title,
                episode: item.episode,
                synopsis: item.synopsis,
                imdb: item.imdb
            });
        });
        const ordenPreferido = ["Hoy", "Jue 19", "Vie 20", "Sáb 21", "Dom 22"];
        const diasDisponibles = Array.from(diasSet).sort((a, b) => {
            const indexA = ordenPreferido.indexOf(a);
            const indexB = ordenPreferido.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b); 
        });
        return { diasDisponibles, programacion };
    }

    function transformarDatosDestacados(csvData) {
        // ... (como estaba)
        return csvData.map(item => ({
            imageUrl: item.imageurl, 
            title: item.title,
            bio: item.bio,
            linkPage: item.linkpage 
        }));
    }


    // --- FUNCIONES DE RENDERIZADO ---
    // renderizarHero ahora usa directamente la variable global datosHeroIncrustados
    // o el parámetro si se lo pasamos desde inicializarUI.
    function renderizarHero(datosHero) { // Acepta datosHero como parámetro
        console.log("RENDERIZAR HERO (con datos incrustados o pasados) - Datos recibidos:", JSON.parse(JSON.stringify(datosHero)));
        if (!heroSliderElement || !heroDotsContainer ) {
            console.error("Elementos del DOM para Hero no encontrados.");
            return;
        }
        if (!datosHero || datosHero.length === 0) {
            console.warn("Hero slider: datos no encontrados o vacíos para renderizarHero.");
            heroSliderElement.innerHTML = '<p style="text-align:center; padding: 50px; color: var(--text-secondary);">No hay películas destacadas.</p>';
            heroDotsContainer.innerHTML = '';
            return;
        }

        heroSliderElement.innerHTML = '';
        heroDotsContainer.innerHTML = '';

        datosHero.forEach((pelicula, index) => {
            // console.log(`--- Procesando Slide Hero ${index} --- Título: ${pelicula.title}`); // Menos verboso ahora
            const slide = document.createElement('div');
            slide.classList.add('hero-slide');
            
            let hasImageError = false;
            if (!pelicula.imageUrl || typeof pelicula.imageUrl !== 'string' || pelicula.imageUrl.trim() === "") {
                console.error(`URL de imagen INVÁLIDA para película Hero "${pelicula.title || 'Desconocida'}". URL recibida:`, pelicula.imageUrl);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message'; // Usar la clase CSS
                errorDiv.innerHTML = `Error: Imagen no disponible para "${pelicula.title || 'Destacado'}".`;
                slide.appendChild(errorDiv);
                hasImageError = true;
            } else {
                let gradient = '';
                if (pelicula.gradientColors && Array.isArray(pelicula.gradientColors) && pelicula.gradientColors.length >= 2) {
                    const gradCol1 = pelicula.gradientColors[0];
                    const gradCol2 = pelicula.gradientColors[1];
                    gradient = `linear-gradient(to right, ${gradCol1}, ${gradCol2})`;
                } else {
                    const defaultGradCol1 = 'rgba(16, 16, 16, 0.9) 20%';
                    const defaultGradCol2 = 'rgba(16, 16, 16, 0.1) 70%';
                    gradient = `linear-gradient(to right, ${defaultGradCol1}, ${defaultGradCol2})`;
                }
                slide.style.backgroundImage = `${gradient}, url('${pelicula.imageUrl}')`;
            }

            // Siempre añadir el contenido, incluso si la imagen falló (el mensaje de error está posicionado encima)
            const heroContentDiv = document.createElement('div');
            heroContentDiv.classList.add('hero-content');
            heroContentDiv.innerHTML = `
                <span class="hero-tag">${pelicula.tag || ''}</span>
                <h2>${pelicula.title || 'Título no disponible'}</h2>
                <p class="description">${pelicula.bio || ''}</p>
                <div class="hero-meta">
                    <span>${pelicula.type || ''}</span>
                    <span>${pelicula.duration || ''}</span>
                    <span>${pelicula.genre || ''}</span>
                </div>
                <div class="hero-buttons">
                    <a class="cta-button" data-page="${pelicula.ctaPage || 'schedule'}">Programación</a>
                    <a href="${pelicula.imdbLink || '#'}" target="_blank" rel="noopener noreferrer" class="cta-button cta-button-secondary">Saber más</a>
                </div>
            `;
            slide.appendChild(heroContentDiv);
            
            heroSliderElement.appendChild(slide);

            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.addEventListener('click', () => { setHeroSlideManual(index); });
            heroDotsContainer.appendChild(dot);
        });
        configurarHeroSlider(datosHero); // Pasar datosHero
    }

    // ... (renderizarEstaNoche, renderizarParrillaHorizontal, renderizarFiccionDestacada, renderizarParrillaVertical, configurarTabsParrillaVertical sin cambios funcionales)
        function renderizarEstaNoche(datosEstaNoche) { 
        if (!liveNowTextElement) return;
        if (!datosEstaNoche || !datosEstaNoche.programas || !datosEstaNoche.programas.length) {
             liveNowTextElement.textContent = "Información no disponible.";
            return;
        }
        const titulos = datosEstaNoche.programas.map(p => `${p.titulo} (${p.hora})`).join(', ');
        liveNowTextElement.textContent = `${datosEstaNoche.prefijo || "Esta Noche"}: ${titulos}`;
    }

    function renderizarParrillaHorizontal(datosParrilla) { 
        if (!programBlocksHomeContainer || !timeMarkersHomeContainer || !timelineElementHome) return;
        if (!datosParrilla || !datosParrilla.programacion || !datosParrilla.programacion['Hoy']) {
             if (programBlocksHomeContainer) programBlocksHomeContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay programación para hoy.</p>';
            return;
        }
        programBlocksHomeContainer.innerHTML = '';
        timeMarkersHomeContainer.innerHTML = '';
        const PIXELS_PER_MINUTE_HORIZONTAL = 4;
        const TIMELINE_START_HOUR_HORIZONTAL = 7; 
        const TIMELINE_TOTAL_HOURS_HORIZONTAL = 22; 
        timelineElementHome.style.width = `${TIMELINE_TOTAL_HOURS_HORIZONTAL * 60 * PIXELS_PER_MINUTE_HORIZONTAL}px`;
        for (let i = 0; i <= TIMELINE_TOTAL_HOURS_HORIZONTAL * 2; i++) { 
            const offsetMinutes = i * 30;
            const markerHour = TIMELINE_START_HOUR_HORIZONTAL + Math.floor(offsetMinutes / 60);
            const markerMinute = offsetMinutes % 60;
            const marker = document.createElement('div');
            marker.classList.add('time-marker-v2');
            marker.style.left = `${offsetMinutes * PIXELS_PER_MINUTE_HORIZONTAL}px`;
            marker.textContent = `${String(markerHour % 24).padStart(2, '0')}:${String(markerMinute).padStart(2, '0')}`;
            timeMarkersHomeContainer.appendChild(marker);
        }
        const programasHoy = datosParrilla.programacion['Hoy'];
        if (!programasHoy || programasHoy.length === 0) {
            programBlocksHomeContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay programación para hoy.</p>';
            return;
        }
        programasHoy.forEach(program => {
            if (typeof program.duration !== 'number' || isNaN(program.duration)) return; 
            let [hour, minute] = program.start.split(':').map(Number);
            let effectiveHour = hour;
            if (hour < TIMELINE_START_HOUR_HORIZONTAL) effectiveHour = hour + 24; 
            const startMinutesFromTimelineStart = (effectiveHour - TIMELINE_START_HOUR_HORIZONTAL) * 60 + minute;
            if (startMinutesFromTimelineStart < 0 || startMinutesFromTimelineStart >= TIMELINE_TOTAL_HOURS_HORIZONTAL * 60) return;
            const block = document.createElement('div');
            block.classList.add('program-item-v2');
            block.style.left = `${startMinutesFromTimelineStart * PIXELS_PER_MINUTE_HORIZONTAL}px`;
            const itemWidth = Math.max(program.duration * PIXELS_PER_MINUTE_HORIZONTAL - 10, 60); 
            block.style.width = `${itemWidth}px`;
            block.innerHTML = `<h3>${program.title}</h3><p>${program.episode || ''}</p>`; 
            const now = new Date();
            const currentDayDate = now.toDateString(); 
            const programDate = new Date(); 
            programDate.setHours(hour, minute, 0, 0);
            const programStartTotalMinutesToday = hour * 60 + minute;
            const programEndTotalMinutesToday = programStartTotalMinutesToday + program.duration;
            const nowTotalMinutesToday = now.getHours() * 60 + now.getMinutes();
            if (currentDayDate === programDate.toDateString() && nowTotalMinutesToday >= programStartTotalMinutesToday && nowTotalMinutesToday < programEndTotalMinutesToday) {
                 block.classList.add('live');
            }
            programBlocksHomeContainer.appendChild(block);
        });
    }

    function renderizarFiccionDestacada(datosDestacados) { 
        if (!fictionGridContainer) return;
        if (!datosDestacados || !datosDestacados.length) {
            fictionGridContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">No hay ficción destacada.</p>';
            return;
        }
        fictionGridContainer.innerHTML = '';
        datosDestacados.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('fiction-card');
            if (item.linkPage) card.setAttribute('data-page', item.linkPage);
            let imageUrl = item.imageUrl;
            if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === "") {
                imageUrl = 'https://placehold.co/600x350/ccc/fff?text=No+Image';
            }
            card.innerHTML = `
                <img src="${imageUrl}" alt="${item.title || 'Destacado'}" onerror="this.onerror=null;this.src='https://placehold.co/600x350/000/fff?text=Error+Img';">
                <div class="fiction-card-info">
                    <h3>${item.title || 'Título no disponible'}</h3>
                    <p>${item.bio || ''}</p>
                </div>
            `;
             if (item.linkPage) { 
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo(item.linkPage);
                });
            }
            fictionGridContainer.appendChild(card);
        });
    }

    function renderizarParrillaVertical(diaKey, datosParrilla) { 
        if (!scheduleListVerticalContainer) return;
        if (!datosParrilla || !datosParrilla.programacion || !datosParrilla.programacion[diaKey]) {
            scheduleListVerticalContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay programación disponible para este día.</p>';
            return;
        }
        scheduleListVerticalContainer.innerHTML = '';
        const scheduleData = datosParrilla.programacion[diaKey];
        const now = new Date();
        const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
        scheduleData.forEach(program => {
            if (typeof program.duration !== 'number' || isNaN(program.duration)) return; 
            const entry = document.createElement('div');
            entry.classList.add('program-entry');
            const [startHour, startMinute] = program.start.split(':').map(Number);
            const programStartTotalMinutes = startHour * 60 + startMinute;
            const programEndTotalMinutes = programStartTotalMinutes + program.duration;
            const esHoyReal = (diaKey === "Hoy" && (new Date().toDateString() === new Date().toDateString()));
            if (esHoyReal && nowTotalMinutes >= programStartTotalMinutes && nowTotalMinutes < programEndTotalMinutes) {
                entry.classList.add('is-live');
            }
            entry.innerHTML = `
                <div class="time-col">
                    <div class="start-time">${program.start}</div>
                    <div class="duration">${program.duration} mins</div>
                </div>
                <div class="details-col">
                    <h3>${program.title}</h3>
                    <p class="episode">${program.episode || ''}</p>
                    <p class="synopsis">${program.synopsis || 'Sinopsis no disponible.'}</p>
                    ${program.imdb && program.imdb !== '#' ? `<a href="${program.imdb}" target="_blank" rel="noopener noreferrer" class="imdb-link">Ver en IMDb</a>` : ''}
                </div>`;
            scheduleListVerticalContainer.appendChild(entry);
        });
    }

    function configurarTabsParrillaVertical(datosParrilla) { 
        if (!dayTabsFullContainer) return;
        if (!datosParrilla || !datosParrilla.diasDisponibles || datosParrilla.diasDisponibles.length === 0) {
            dayTabsFullContainer.innerHTML = '';
            if(scheduleListVerticalContainer) scheduleListVerticalContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay programación disponible.</p>';
            return;
        }
        dayTabsFullContainer.innerHTML = '';
        datosParrilla.diasDisponibles.forEach((diaKey, index) => {
            const tabButton = document.createElement('button');
            tabButton.textContent = diaKey;
            if (index === 0) tabButton.classList.add('active'); 
            tabButton.addEventListener('click', () => {
                const currentActive = dayTabsFullContainer.querySelector('.active');
                if (currentActive) currentActive.classList.remove('active');
                tabButton.classList.add('active');
                renderizarParrillaVertical(diaKey, datosParrilla);
            });
            dayTabsFullContainer.appendChild(tabButton);
        });
        if (datosParrilla.diasDisponibles.length > 0) {
            renderizarParrillaVertical(datosParrilla.diasDisponibles[0], datosParrilla); 
        }
    }

    // --- LÓGICA DE COMPONENTES Y NAVEGACIÓN (sin cambios) ---
    // (navigateTo, configurarNavegacion, configurarHeroSlider, setHeroSlideManual, configurarTimelineHorizontalScroll)
    // ... Estas funciones permanecen como en la versión anterior ...
    function navigateTo(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('active');
            window.scrollTo(0, 0);
            navLinks.forEach(navLink => {
                navLink.classList.toggle('active', navLink.getAttribute('data-page') === pageId);
            });
        }
    }

    function configurarNavegacion() {
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const pageId = link.getAttribute('data-page');
                if (pageId) navigateTo(pageId);
            });
        });
        const logoElement = document.querySelector('.logo-link[data-page="home"]'); 
        if(logoElement) {
            logoElement.addEventListener('click', (event) => {
                 event.preventDefault();
                 navigateTo('home');
            });
        }
        const fullScheduleLinks = document.querySelectorAll('.full-schedule-link[data-page="schedule"]');
        fullScheduleLinks.forEach(link => {
             link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('schedule');
            });
        });
    }

    function configurarHeroSlider(datosHero) { 
        if (!heroSliderElement || !datosHero || datosHero.length === 0) { 
             if (heroSliderElement) heroSliderElement.innerHTML = '<p style="text-align:center; padding: 50px; color: var(--text-secondary);">No hay películas destacadas.</p>';
            if(heroDotsContainer) heroDotsContainer.innerHTML = '';
            return;
        }
        const slides = heroSliderElement.querySelectorAll('.hero-slide');
        const dots = heroDotsContainer.querySelectorAll('.dot');
        if (slides.length === 0) return;

        function updateHeroSlideDisplay() {
            slides.forEach((s, i) => s.classList.toggle('active', i === currentHeroSlide));
            if (dots.length > 0) {
                dots.forEach((d, i) => d.classList.toggle('active', i === currentHeroSlide));
            }
            const activeSlide = slides[currentHeroSlide];
            if(activeSlide) {
                const ctaButton = activeSlide.querySelector('.hero-content .cta-button[data-page]'); // Más específico
                if (ctaButton && !ctaButton.hasAttribute('data-listener-attached')) {
                    ctaButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pageId = ctaButton.getAttribute('data-page');
                        if (pageId) navigateTo(pageId);
                    });
                    ctaButton.setAttribute('data-listener-attached', 'true');
                }
            }
        }
        function nextHeroSlide() {
            currentHeroSlide = (currentHeroSlide + 1) % slides.length;
            updateHeroSlideDisplay();
        }
        if (heroAutoSlideInterval) clearInterval(heroAutoSlideInterval);
        if (slides.length > 1) { 
            heroAutoSlideInterval = setInterval(nextHeroSlide, 5600);
        }
        updateHeroSlideDisplay(); 
    }
    
    function setHeroSlideManual(index) {
        if (!heroSliderElement) return;
        const slides = heroSliderElement.querySelectorAll('.hero-slide');
        if (slides.length === 0 || index < 0 || index >= slides.length) return;
        
        if (heroAutoSlideInterval) clearInterval(heroAutoSlideInterval);
        currentHeroSlide = index;
        
        slides.forEach((s, i) => s.classList.toggle('active', i === currentHeroSlide));
        const dots = heroDotsContainer.querySelectorAll('.dot');
        if (dots.length > 0) {
            dots.forEach((d, i) => d.classList.toggle('active', i === currentHeroSlide));
        }

        if (slides.length > 1) { 
            heroAutoSlideInterval = setInterval(() => {
                currentHeroSlide = (currentHeroSlide + 1) % slides.length;
                slides.forEach((s, i) => s.classList.toggle('active', i === currentHeroSlide));
                if (dots.length > 0) {
                     dots.forEach((d, i) => d.classList.toggle('active', i === currentHeroSlide));
                }
            }, 5600);
        }
    }

    function configurarTimelineHorizontalScroll() {
        if (!timelineWrapper) return;
        let isDown = false;
        let startX;
        let scrollLeft;
        timelineWrapper.addEventListener('mousedown', (e) => { isDown = true; timelineWrapper.classList.add('active'); startX = e.pageX - timelineWrapper.offsetLeft; scrollLeft = timelineWrapper.scrollLeft; });
        timelineWrapper.addEventListener('mouseleave', () => { isDown = false; timelineWrapper.classList.remove('active'); });
        timelineWrapper.addEventListener('mouseup', () => { isDown = false; timelineWrapper.classList.remove('active'); });
        timelineWrapper.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - timelineWrapper.offsetLeft; const walk = (x - startX) * 2.5; timelineWrapper.scrollLeft = scrollLeft - walk; });
    }


    // --- INICIALIZACIÓN DE LA UI ---
    async function inicializarUI() {
        if (window.location.protocol === 'file:') {
            // ... (advertencia de file:// como estaba)
            console.warn(
                "ADVERTENCIA: La página se está ejecutando localmente (file:///).\n" +
                "La carga de datos CSV mediante 'fetch' puede fallar debido a las políticas CORS del navegador.\n" +
                "Para un funcionamiento correcto, por favor, sirva esta página a través de un servidor HTTP local."
            );
            if (appContainer && !appContainer.querySelector('.file-protocol-warning')) {
                const warningMsg = document.createElement('div');
                warningMsg.className = 'file-protocol-warning';
                // ... (estilos del mensaje de advertencia como estaban)
                warningMsg.style.backgroundColor = 'rgba(255, 220, 100, 0.9)';
                warningMsg.style.color = '#333';
                warningMsg.style.padding = '15px';
                warningMsg.style.margin = '0'; // Sin margen para que quede pegado arriba
                warningMsg.style.textAlign = 'center';
                warningMsg.style.borderBottom = '1px solid #cc9900'; // Solo borde inferior
                warningMsg.style.position = 'fixed';
                warningMsg.style.top = 'var(--header-height)';
                warningMsg.style.left = '0';
                warningMsg.style.right = '0';
                warningMsg.style.zIndex = '2000';
                warningMsg.innerHTML = `
                    <strong>ADVERTENCIA:</strong> Estás viendo esta página sin un servidor local.
                    La carga de datos podría fallar. Para una experiencia completa, usa un 
                    <a href="https://developer.mozilla.org/es/docs/Learn/Common_questions/set_up_a_local_testing_server" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">
                        servidor de pruebas local
                    </a>.`;
                document.body.insertBefore(warningMsg, document.body.firstChild); // Insertar al inicio del body
                // Ajustar padding-top del app-container si el mensaje está presente
                appContainer.style.paddingTop = `calc(var(--header-height) + ${warningMsg.offsetHeight}px)`;
            }
        }

        try {
            // Se usa datosHeroIncrustados directamente. No se hace fetch para hero.csv
            const [
                // heroCsvData, // YA NO SE CARGA hero.csv
                estaNocheCsvData,
                parrillaCsvData,
                destacadosCsvData
            ] = await Promise.all([
                // fetchCSV('data/hero.csv'), // YA NO SE CARGA hero.csv
                fetchCSV('data/esta_noche.csv'),
                fetchCSV('data/parrilla.csv'),
                fetchCSV('data/destacados.csv')
            ]);

            // Usar los datos incrustados para Hero
            const datosHero = datosHeroIncrustados; // <<<<<<<<<< CAMBIO AQUÍ

            const datosEstaNoche = transformarDatosEstaNoche(estaNocheCsvData);
            const datosParrilla = transformarDatosParrilla(parrillaCsvData);
            const datosDestacados = transformarDatosDestacados(destacadosCsvData);
            
            // ... (resto de la lógica de inicializarUI y renderizado como estaba)
             let datosCargadosCorrectamente = 
                (datosHero && datosHero.length > 0) || // Hero siempre debería estar cargado ahora
                (datosEstaNoche && datosEstaNoche.programas && datosEstaNoche.programas.length > 0) ||
                (datosParrilla && datosParrilla.diasDisponibles && datosParrilla.diasDisponibles.length > 0) ||
                (datosDestacados && datosDestacados.length > 0);

            if (!datosCargadosCorrectamente && window.location.protocol === 'file:') {
                 console.error("Algunos datos CSV no se pudieron cargar en modo file://. La página puede no mostrarse correctamente. Revisa la advertencia anterior.");
            }

            renderizarHero(datosHero); // Pasar los datosHero (ahora incrustados)
            renderizarEstaNoche(datosEstaNoche);
            if (datosParrilla && datosParrilla.diasDisponibles && datosParrilla.diasDisponibles.length > 0) {
                renderizarParrillaHorizontal(datosParrilla);
                configurarTabsParrillaVertical(datosParrilla);
            } else {
                 console.warn("Datos de Parrilla no disponibles para renderizar (diasDisponibles está vacío o no existe).");
                if (programBlocksHomeContainer) programBlocksHomeContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">Programación no disponible.</p>';
                if (dayTabsFullContainer) dayTabsFullContainer.innerHTML = '';
                if (scheduleListVerticalContainer) scheduleListVerticalContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">Programación no disponible.</p>';
            }
            renderizarFiccionDestacada(datosDestacados);
            
            configurarNavegacion();
            configurarTimelineHorizontalScroll();
            navigateTo('home');


        } catch (error) {
            console.error("Error FATAL durante la inicialización de la UI:", error);
            if(appContainer) appContainer.innerHTML = "<p style='text-align:center; padding: 50px; color: var(--text-secondary); font-size:1.2em;'><strong>Error crítico al cargar la aplicación.</strong><br>Por favor, revise la consola para más detalles o inténtelo más tarde.</p>";
        }
    }

    inicializarUI();
});
