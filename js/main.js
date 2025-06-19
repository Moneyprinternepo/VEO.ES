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

    // --- FUNCIÓN DE PARSEO DE CSV ---
    function parseCSV(csvText, delimiter = ';') {
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
            // Si una línea tiene menos valores que cabeceras, puede ser problemático.
            // Por ahora, se asignará "" a las columnas faltantes.
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
        // ... (sin cambios respecto a tu última versión con la advertencia de file:///)
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
            if (window.location.protocol === 'file:' && appContainer) {
                const errorMsgEl = appContainer.querySelector('.fetch-error-message[data-file="' + filePath + '"]');
                if (!errorMsgEl) {
                    const errorMsg = document.createElement('p');
                    errorMsg.className = 'fetch-error-message';
                    errorMsg.setAttribute('data-file', filePath);
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
    function transformarDatosHero(csvData) {
        console.log("Transformando datos Hero CSV:", csvData);
        return csvData.map((item, index) => {
            let parsedGradientColors = ["rgba(16, 16, 16, 0.9) 20%", "rgba(16, 16, 16, 0.1) 70%"]; // Default
            if (item.gradientcolors) {
                const splitColors = item.gradientcolors.split(';').map(s => s.trim()).filter(s => s !== "");
                if (splitColors.length >= 2) {
                    parsedGradientColors = splitColors;
                } else {
                    console.warn(`Item ${index} (${item.title || 'Hero'}): 'gradientcolors' no contiene al menos dos colores separados por ';'. Se usarán valores por defecto. Recibido: "${item.gradientcolors}"`);
                }
            } else {
                 console.warn(`Item ${index} (${item.title || 'Hero'}): 'gradientcolors' no encontrado. Se usarán valores por defecto.`);
            }

            const transformed = {
                id: item.id,
                tag: item.tag,
                title: item.title,
                bio: item.bio,
                type: item.type,
                duration: item.duration,
                genre: item.genre,
                imdbLink: item.imbdlink,
                imageUrl: item.imageurl,
                gradientColors: parsedGradientColors,
                ctaPage: item.ctapage
            };
            // console.log(`Hero item ${index} transformado:`, transformed);
            return transformed;
        });
    }

    // ... (transformarDatosEstaNoche, transformarDatosParrilla, transformarDatosDestacados sin cambios funcionales, pero asegúrate de que los nombres de las claves (ej. item.imageurl) coincidan con las cabeceras minúsculas de tus CSV)
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
                // console.warn("Fila de parrilla incompleta, saltando:", item); // Ya existe
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
        return csvData.map(item => ({
            imageUrl: item.imageurl, 
            title: item.title,
            bio: item.bio,
            linkPage: item.linkpage 
        }));
    }

    // --- FUNCIONES DE RENDERIZADO ---
    function renderizarHero(datosHero) {
        console.log("RENDERIZAR HERO - Datos recibidos:", JSON.parse(JSON.stringify(datosHero)));
        if (!heroSliderElement || !heroDotsContainer ) {
            console.error("Elementos del DOM para Hero no encontrados.");
            return;
        }
        if (!datosHero || datosHero.length === 0) {
            console.warn("Hero slider: datos no encontrados o vacíos para renderizarHero.");
            heroSliderElement.innerHTML = '<p style="text-align:center; padding: 50px; color: var(--text-secondary);">No hay películas destacadas en este momento.</p>';
            heroDotsContainer.innerHTML = '';
            return;
        }

        heroSliderElement.innerHTML = '';
        heroDotsContainer.innerHTML = '';

        datosHero.forEach((pelicula, index) => {
            console.log(`--- Procesando Slide Hero ${index} --- Título: ${pelicula.title}`);
            const slide = document.createElement('div');
            slide.classList.add('hero-slide');
            
            let slideContentHTML = ''; // Para construir el contenido interno
            let hasError = false;

            if (!pelicula.imageUrl || typeof pelicula.imageUrl !== 'string' || pelicula.imageUrl.trim() === "") {
                console.error(`URL de imagen INVÁLIDA para película Hero "${pelicula.title || 'Desconocida'}". URL recibida:`, pelicula.imageUrl);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `Error: Imagen no disponible para "${pelicula.title || 'Destacado'}".`;
                slide.appendChild(errorDiv); // Añadir mensaje de error al slide
                hasError = true;
                // No se establece backgroundImage, se usará el color de fondo de fallback del CSS
            } else {
                console.log(`URL de imagen VÁLIDA para Hero: '${pelicula.imageUrl}'`);
                let gradient = '';
                // Asegurar que gradientColors es un array y tiene al menos 2 elementos.
                if (pelicula.gradientColors && Array.isArray(pelicula.gradientColors) && pelicula.gradientColors.length >= 2) {
                    const gradCol1 = pelicula.gradientColors[0];
                    const gradCol2 = pelicula.gradientColors[1];
                    gradient = `linear-gradient(to right, ${gradCol1}, ${gradCol2})`;
                } else {
                    // Si gradientColors es inválido, usar un gradiente por defecto o ninguno.
                    // Aquí usamos un gradiente por defecto para no romper la estructura visual.
                    console.warn(`gradientColors inválido o incompleto para "${pelicula.title}". Usando gradiente por defecto. Recibido:`, pelicula.gradientColors);
                    const defaultGradCol1 = 'rgba(16, 16, 16, 0.9) 20%';
                    const defaultGradCol2 = 'rgba(16, 16, 16, 0.1) 70%';
                    gradient = `linear-gradient(to right, ${defaultGradCol1}, ${defaultGradCol2})`;
                }
                const finalBackgroundImage = `${gradient}, url('${pelicula.imageUrl}')`;
                console.log("Aplicando background-image a Hero slide:", finalBackgroundImage);
                slide.style.backgroundImage = finalBackgroundImage;
            }

            slideContentHTML = `
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
            // Si hay un error de imagen, el mensaje de error ya está en el slide.
            // Si no hay error, añadimos el contenido normal.
            if (!hasError) {
                slide.innerHTML = slideContentHTML;
            } else {
                 // Si hubo error, el contenido del slide (con el mensaje de error) ya está.
                 // Podrías decidir añadir el hero-content igualmente pero sin la imagen.
                 // O dejarlo como está (solo mensaje de error). Por ahora, el mensaje de error
                 // es el contenido principal si la imagen falla.
                 // Si quieres añadir el contenido de todas formas:
                 // const contentDiv = document.createElement('div');
                 // contentDiv.innerHTML = slideContentHTML;
                 // Array.from(contentDiv.children).forEach(child => slide.appendChild(child));
            }

            heroSliderElement.appendChild(slide);

            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.addEventListener('click', () => { setHeroSlideManual(index); });
            heroDotsContainer.appendChild(dot);
        });
        configurarHeroSlider(datosHero);
    }

    function renderizarEstaNoche(datosEstaNoche) { 
        // ... (sin cambios funcionales, asegurar que datosEstaNoche es válido)
        if (!liveNowTextElement) return;
        if (!datosEstaNoche || !datosEstaNoche.programas || !datosEstaNoche.programas.length) {
             liveNowTextElement.textContent = "Información no disponible.";
            return;
        }
        const titulos = datosEstaNoche.programas.map(p => `${p.titulo} (${p.hora})`).join(', ');
        liveNowTextElement.textContent = `${datosEstaNoche.prefijo || "Esta Noche"}: ${titulos}`;
    }

    function renderizarParrillaHorizontal(datosParrilla) { 
        // ... (sin cambios funcionales, asegurar que datosParrilla es válido)
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
        // ... (sin cambios funcionales, asegurar que datosDestacados es válido)
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
            // Validar imageUrl para Destacados también
            let imageUrl = item.imageUrl;
            if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === "") {
                console.warn(`URL de imagen inválida para Destacado "${item.title}". Usando placeholder.`);
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
        // ... (sin cambios funcionales, asegurar que datosParrilla es válido)
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
        // ... (sin cambios funcionales, asegurar que datosParrilla es válido)
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

    // --- LÓGICA DE COMPONENTES Y NAVEGACIÓN (sin cambios funcionales) ---
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
             if (heroSliderElement) heroSliderElement.innerHTML = '<p style="text-align:center; padding: 50px; color: var(--text-secondary);">No hay películas destacadas en este momento.</p>';
            if(heroDotsContainer) heroDotsContainer.innerHTML = '';
            return;
        }
        const slides = heroSliderElement.querySelectorAll('.hero-slide');
        const dots = heroDotsContainer.querySelectorAll('.dot');
        if (slides.length === 0) {
            console.warn("ConfigurarHeroSlider: No se encontraron slides renderizados.");
            return;
        }

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
        if (slides.length > 1) { // Solo iniciar intervalo si hay más de un slide
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

        if (slides.length > 1) { // Reiniciar intervalo si hay más de un slide
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
            console.warn(
                "ADVERTENCIA: La página se está ejecutando localmente (file:///).\n" +
                "La carga de datos CSV mediante 'fetch' puede fallar debido a las políticas CORS del navegador.\n" +
                "Para un funcionamiento correcto, por favor, sirva esta página a través de un servidor HTTP local."
            );
            if (appContainer && !appContainer.querySelector('.file-protocol-warning')) {
                const warningMsg = document.createElement('div');
                warningMsg.className = 'file-protocol-warning';
                warningMsg.style.backgroundColor = 'rgba(255, 220, 100, 0.9)';
                warningMsg.style.color = '#333';
                warningMsg.style.padding = '15px';
                warningMsg.style.margin = '20px auto';
                warningMsg.style.maxWidth = '800px';
                warningMsg.style.textAlign = 'center';
                warningMsg.style.border = '1px solid #cc9900';
                warningMsg.style.borderRadius = '5px';
                warningMsg.style.position = 'fixed';
                warningMsg.style.top = 'var(--header-height)';
                warningMsg.style.left = '50%';
                warningMsg.style.transform = 'translateX(-50%)';
                warningMsg.style.zIndex = '2000';
                warningMsg.innerHTML = `
                    <strong>ADVERTENCIA:</strong> Estás viendo esta página sin un servidor local.
                    La carga de datos podría fallar. Para una experiencia completa, usa un 
                    <a href="https://developer.mozilla.org/es/docs/Learn/Common_questions/set_up_a_local_testing_server" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">
                        servidor de pruebas local
                    </a>.`;
                appContainer.prepend(warningMsg); // Prepend para que esté arriba
            }
        }

        try {
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

            const datosHero = transformarDatosHero(heroCsvData);
            const datosEstaNoche = transformarDatosEstaNoche(estaNocheCsvData);
            const datosParrilla = transformarDatosParrilla(parrillaCsvData);
            const datosDestacados = transformarDatosDestacados(destacadosCsvData);
            
            let datosCargadosCorrectamente = 
                (datosHero && datosHero.length > 0) ||
                (datosEstaNoche && datosEstaNoche.programas && datosEstaNoche.programas.length > 0) ||
                (datosParrilla && datosParrilla.diasDisponibles && datosParrilla.diasDisponibles.length > 0) || // Chequear diasDisponibles en vez de programacion para la parrilla
                (datosDestacados && datosDestacados.length > 0);

            if (!datosCargadosCorrectamente && window.location.protocol === 'file:') {
                 console.error("No se pudieron cargar los datos CSV en modo file://. La página puede no mostrarse correctamente. Revisa la advertencia anterior.");
                 // Aún así intentar renderizar lo que se pueda o mostrar mensajes de error específicos
            }

            renderizarHero(datosHero);
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
