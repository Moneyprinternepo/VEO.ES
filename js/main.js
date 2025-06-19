document.addEventListener('DOMContentLoaded', function() {
    // Selectores del DOM
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

    // --- DATOS JSON ELIMINADOS ---
    // Ya no se usan las variables datosHero, datosEstaNoche, datosParrilla, datosDestacados aquí

    // Variables de estado
    let currentHeroSlide = 0;
    let heroAutoSlideInterval;

    // --- FUNCIÓN DE PARSEO DE CSV ---
    function parseCSV(csvText, delimiter = ';') {
        // Eliminar BOM (Byte Order Mark) si está presente
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }

        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return [];

        const headers = lines[0].split(delimiter).map(header => header.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === "") continue;

            const values = line.split(delimiter);
            const entry = {};
            
            headers.forEach((header, index) => {
                let value = values[index] || ""; // Asegurar que haya un valor, incluso si la línea es corta

                // Eliminar comillas dobles si rodean el valor
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                // Reemplazar comillas dobles escapadas ("") por una comilla doble (")
                value = value.replace(/""/g, '"');
                entry[header] = value.trim();
            });
            data.push(entry);
        }
        return data;
    }

    async function fetchCSV(filePath, delimiter = ';') {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Error al cargar ${filePath}: ${response.statusText}`);
            }
            const csvText = await response.text();
            return parseCSV(csvText, delimiter);
        } catch (error) {
            console.error(`Fallo al obtener o parsear ${filePath}:`, error);
            return []; // Devolver array vacío en caso de error para no romper Promise.all
        }
    }

    // --- FUNCIONES DE TRANSFORMACIÓN DE DATOS CSV A ESTRUCTURA ORIGINAL ---
    function transformarDatosHero(csvData) {
        return csvData.map(item => ({
            id: item.id,
            tag: item.tag,
            title: item.title,
            bio: item.bio,
            type: item.type,
            duration: item.duration,
            genre: item.genre,
            imdbLink: item.imbdlink, // Nótese el cambio de 'imdbLink' a 'imbdlink' según CSV
            imageUrl: item.imageurl,
            gradientColors: item.gradientcolors ? item.gradientcolors.split(';') : ["rgba(16, 16, 16, 0.9) 20%", "rgba(16, 16, 16, 0.1) 70%"],
            ctaPage: item.ctapage
        }));
    }

    function transformarDatosEstaNoche(csvData) {
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
        const programacion = {};
        const diasSet = new Set();

        csvData.forEach(item => {
            if (!item.diakey || !item.start || !item.duration || !item.title) {
                console.warn("Fila de parrilla incompleta, saltando:", item);
                return;
            }
            const dia = item.diakey;
            if (!programacion[dia]) {
                programacion[dia] = [];
            }
            diasSet.add(dia);
            programacion[dia].push({
                start: item.start,
                duration: parseInt(item.duration, 10), // Convertir a número
                title: item.title,
                episode: item.episode,
                synopsis: item.synopsis,
                imdb: item.imdb
            });
        });
        
        // Ordenar los días como en el JSON original (Hoy primero, luego los demás)
        const ordenPreferido = ["Hoy", "Jue 19", "Vie 20", "Sáb 21", "Dom 22"];
        const diasDisponibles = Array.from(diasSet).sort((a, b) => {
            const indexA = ordenPreferido.indexOf(a);
            const indexB = ordenPreferido.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            // Si no están en la lista de orden, se pueden ordenar alfabéticamente o por aparición
            return a.localeCompare(b); 
        });


        return { diasDisponibles, programacion };
    }

    function transformarDatosDestacados(csvData) {
        return csvData.map(item => ({
            imageUrl: item.imageurl,
            title: item.title,
            bio: item.bio,
            linkPage: item.linkpage
        }));
    }


    // --- FUNCIONES DE RENDERIZADO (sin cambios en la lógica interna, solo cómo reciben los datos) ---
    function renderizarHero(datosHero) { // Ahora recibe datosHero como argumento
        if (!heroSliderElement || !heroDotsContainer || !datosHero || !datosHero.length) {
            console.warn("Hero slider o datos no encontrados/vacíos.");
            if (heroSliderElement) heroSliderElement.innerHTML = '<p style="text-align:center; padding: 50px; color: var(--text-secondary);">No hay películas destacadas en este momento.</p>';
            if (heroDotsContainer) heroDotsContainer.innerHTML = '';
            return;
        }
        heroSliderElement.innerHTML = '';
        heroDotsContainer.innerHTML = '';

        datosHero.forEach((pelicula, index) => {
            const slide = document.createElement('div');
            slide.classList.add('hero-slide');
            const gradCol1 = pelicula.gradientColors && pelicula.gradientColors.length > 0 ? pelicula.gradientColors[0] : 'rgba(16, 16, 16, 0.9) 20%';
            const gradCol2 = pelicula.gradientColors && pelicula.gradientColors.length > 1 ? pelicula.gradientColors[1] : 'rgba(16, 16, 16, 0.1) 70%';
            const gradient = `linear-gradient(to right, ${gradCol1}, ${gradCol2})`;
            slide.style.backgroundImage = `${gradient}, url('${pelicula.imageUrl}')`;

            slide.innerHTML = `
                <div class="hero-content">
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
                </div>
            `;
            heroSliderElement.appendChild(slide);

            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.addEventListener('click', () => { setHeroSlideManual(index); });
            heroDotsContainer.appendChild(dot);
        });
        configurarHeroSlider(datosHero); // Pasar datosHero
    }

    function renderizarEstaNoche(datosEstaNoche) { // Ahora recibe datosEstaNoche
        if (!liveNowTextElement || !datosEstaNoche || !datosEstaNoche.programas || !datosEstaNoche.programas.length) {
             if(liveNowTextElement) liveNowTextElement.textContent = "Información no disponible.";
            return;
        }
        const titulos = datosEstaNoche.programas.map(p => `${p.titulo} (${p.hora})`).join(', ');
        liveNowTextElement.textContent = `${datosEstaNoche.prefijo || "Esta Noche"}: ${titulos}`;
    }

    function renderizarParrillaHorizontal(datosParrilla) { // Ahora recibe datosParrilla
        if (!programBlocksHomeContainer || !timeMarkersHomeContainer || !timelineElementHome || !datosParrilla || !datosParrilla.programacion || !datosParrilla.programacion['Hoy']) {
            console.warn("Parrilla Horizontal: Elementos DOM o datos de 'Hoy' no encontrados.");
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
            console.warn("Parrilla Horizontal: No hay programas para 'Hoy'.");
            programBlocksHomeContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay programación para hoy.</p>';
            return;
        }

        programasHoy.forEach(program => {
            if (typeof program.duration !== 'number' || isNaN(program.duration)) {
                console.error(`Parrilla Horizontal: Duración inválida para "${program.title}":`, program.duration);
                return; 
            }

            let [hour, minute] = program.start.split(':').map(Number);
            let effectiveHour = hour;
            if (hour < TIMELINE_START_HOUR_HORIZONTAL) {
                 effectiveHour = hour + 24; 
            }

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

            if (currentDayDate === programDate.toDateString() &&
                nowTotalMinutesToday >= programStartTotalMinutesToday && nowTotalMinutesToday < programEndTotalMinutesToday) {
                 block.classList.add('live');
            }
    
            programBlocksHomeContainer.appendChild(block);
        });
    }

    function renderizarFiccionDestacada(datosDestacados) { // Ahora recibe datosDestacados
        if (!fictionGridContainer || !datosDestacados || !datosDestacados.length) {
            console.warn("Ficción Destacada: Contenedor o datos no encontrados/vacíos.");
            if(fictionGridContainer) fictionGridContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">No hay ficción destacada.</p>';
            return;
        }
        fictionGridContainer.innerHTML = '';
        datosDestacados.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('fiction-card');
            if (item.linkPage) card.setAttribute('data-page', item.linkPage);

            card.innerHTML = `
                <img src="${item.imageUrl || 'https://placehold.co/600x350/ccc/fff?text=No+Image'}" alt="${item.title || 'Destacado'}" onerror="this.onerror=null;this.src='https://placehold.co/600x350/000/fff?text=Error+Img';">
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

    function renderizarParrillaVertical(diaKey, datosParrilla) { // Ahora recibe datosParrilla
        if (!scheduleListVerticalContainer || !datosParrilla || !datosParrilla.programacion || !datosParrilla.programacion[diaKey]) {
            if(scheduleListVerticalContainer) scheduleListVerticalContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay programación disponible para este día.</p>';
            console.warn(`Parrilla Vertical: No hay datos para el día "${diaKey}"`);
            return;
        }
        scheduleListVerticalContainer.innerHTML = '';
        const scheduleData = datosParrilla.programacion[diaKey];
        const now = new Date();
        const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
        
        scheduleData.forEach(program => {
            if (typeof program.duration !== 'number' || isNaN(program.duration)) {
                console.error(`Parrilla Vertical: Duración inválida para "${program.title}" en día "${diaKey}":`, program.duration);
                return; 
            }

            const entry = document.createElement('div');
            entry.classList.add('program-entry');
            const [startHour, startMinute] = program.start.split(':').map(Number);
            const programStartTotalMinutes = startHour * 60 + startMinute;
            const programEndTotalMinutes = programStartTotalMinutes + program.duration;

            // Para la lógica 'is-live', 'Hoy' en los datos debe referirse al día actual real.
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

    function configurarTabsParrillaVertical(datosParrilla) { // Ahora recibe datosParrilla
        if (!dayTabsFullContainer || !datosParrilla || !datosParrilla.diasDisponibles || datosParrilla.diasDisponibles.length === 0) {
            console.warn("Tabs Parrilla Vertical: Contenedor o diasDisponibles no encontrados/vacíos.");
            if(dayTabsFullContainer) dayTabsFullContainer.innerHTML = '';
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

    // --- LÓGICA DE COMPONENTES Y NAVEGACIÓN (Mayormente sin cambios) ---
    function navigateTo(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('active');
            window.scrollTo(0, 0);

            navLinks.forEach(navLink => {
                navLink.classList.toggle('active', navLink.getAttribute('data-page') === pageId);
            });
        } else {
            console.warn(`Página con ID '${pageId}' no encontrada.`);
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
        
        const logoElement = document.querySelector('.logo-link[data-page="home"]'); // Actualizado selector
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

    function configurarHeroSlider(datosHero) { // Ahora recibe datosHero
        if (!heroSliderElement || !datosHero || datosHero.length === 0) { // Comprobar datosHero
             if (heroSliderElement) heroSliderElement.innerHTML = '<p style="text-align:center; padding: 50px; color: var(--text-secondary);">No hay películas destacadas en este momento.</p>';
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
                const ctaButton = activeSlide.querySelector('.cta-button[data-page]');
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
        heroAutoSlideInterval = setInterval(nextHeroSlide, 5600);
        
        updateHeroSlideDisplay(); 
    }
    
    function setHeroSlideManual(index) {
        if (!heroSliderElement) return;
        const slides = heroSliderElement.querySelectorAll('.hero-slide');
        if (index < 0 || index >= slides.length) return;

        clearInterval(heroAutoSlideInterval);
        currentHeroSlide = index;
        
        // Re-llamar a configurarHeroSlider no es necesario aquí si solo actualizamos
        // el display. Si se quisiera reiniciar el intervalo con datos frescos (que no cambian aquí):
        // configurarHeroSlider(aqui_necesitarias_pasar_datos_hero_globales_o_recargarlos);
        // Por ahora, solo actualizamos el display y el intervalo se reiniciará en la próxima llamada natural.
        // O mejor:
        const dots = heroDotsContainer.querySelectorAll('.dot');
        slides.forEach((s, i) => s.classList.toggle('active', i === currentHeroSlide));
        if (dots.length > 0) {
            dots.forEach((d, i) => d.classList.toggle('active', i === currentHeroSlide));
        }
        // Reiniciar el intervalo
        if (heroAutoSlideInterval) clearInterval(heroAutoSlideInterval);
        heroAutoSlideInterval = setInterval(() => {
            currentHeroSlide = (currentHeroSlide + 1) % slides.length;
            slides.forEach((s, i) => s.classList.toggle('active', i === currentHeroSlide));
            if (dots.length > 0) {
                 dots.forEach((d, i) => d.classList.toggle('active', i === currentHeroSlide));
            }
        }, 5600);
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
        try {
            // Cargar todos los datos CSV en paralelo
            const [
                heroCsvData,
                estaNocheCsvData,
                parrillaCsvData,
                destacadosCsvData
            ] = await Promise.all([
                fetchCSV('data/hero.csv'),
                fetchCSV('data/esta_noche.csv'),
                fetchCSV('data/parrilla.csv'),
                fetchCSV('data/destacados.csv')
            ]);

            // Transformar los datos CSV a la estructura JS esperada
            const datosHero = transformarDatosHero(heroCsvData);
            const datosEstaNoche = transformarDatosEstaNoche(estaNocheCsvData);
            const datosParrilla = transformarDatosParrilla(parrillaCsvData);
            const datosDestacados = transformarDatosDestacados(destacadosCsvData);

            // Renderizar componentes con los datos cargados
            if (datosHero && datosHero.length > 0) renderizarHero(datosHero);
            else console.warn("Datos del Hero vacíos o no definidos después de cargar CSV.");

            if (datosEstaNoche && datosEstaNoche.programas) renderizarEstaNoche(datosEstaNoche);
            else console.warn("Datos de Esta Noche vacíos, no definidos o sin 'programas' después de cargar CSV.");

            if (datosParrilla && datosParrilla.programacion && Object.keys(datosParrilla.programacion).length > 0) {
                if (datosParrilla.programacion['Hoy']) renderizarParrillaHorizontal(datosParrilla);
                else console.warn("Parrilla Horizontal: No hay datos para 'Hoy' después de cargar CSV.");
                
                if (datosParrilla.diasDisponibles) configurarTabsParrillaVertical(datosParrilla);
                else console.warn("Parrilla Vertical: 'diasDisponibles' no encontrado después de cargar CSV.");
            } else {
                console.warn("Datos de Parrilla vacíos, no definidos o malformados después de cargar CSV.");
            }

            if (datosDestacados && datosDestacados.length > 0) renderizarFiccionDestacada(datosDestacados);
            else console.warn("Datos Destacados vacíos o no definidos después de cargar CSV.");
            
            configurarNavegacion();
            configurarTimelineHorizontalScroll();

            navigateTo('home');

        } catch (error) {
            console.error("Error general durante la inicialización de la UI:", error);
            // Podrías mostrar un mensaje de error al usuario en la página aquí
            if(appContainer) appContainer.innerHTML = "<p style='text-align:center; padding: 50px; color: var(--text-secondary);'>Error al cargar los datos de la aplicación. Por favor, inténtelo más tarde.</p>";
        }
    }

    // Llamar a inicializarUI
    inicializarUI();
});