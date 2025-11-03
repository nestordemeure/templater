// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
    frontImages: [],
    backImages: [],
    isImperial: true,
    config: {
        paperSize: 'letter',
        cardPreset: 'us_business',
        cardWidth: 3.5,
        cardHeight: 2,
        gridRows: 5,
        gridCols: 2,
        showCutLines: true,
        fullPageMode: true
    }
};

// Paper sizes in inches (width, height)
const PAPER_SIZES = {
    letter: [8.5, 11],
    a4: [8.27, 11.69], // 210mm × 297mm
    legal: [8.5, 14],
    tabloid: [11, 17]
};

// Card presets in inches (width, height)
const CARD_PRESETS = {
    us_business: { width: 3.5, height: 2 },
    eu_business: { width: 3.346, height: 2.165 }, // 85mm × 55mm
    bridge: { width: 2.25, height: 3.5 },
    poker: { width: 2.5, height: 3.5 },
    custom: null // User-defined
};

// ============================================================================
// MARGIN CALCULATION
// ============================================================================

function calculateMargins() {
    const paperSize = PAPER_SIZES[state.config.paperSize];
    const { cardWidth, cardHeight, gridRows, gridCols } = state.config;

    const totalCardWidth = gridCols * cardWidth;
    const totalCardHeight = gridRows * cardHeight;

    const sideMargin = (paperSize[0] - totalCardWidth) / 2;
    const topMargin = (paperSize[1] - totalCardHeight) / 2;

    return { topMargin, sideMargin };
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

const MM_TO_INCH = 0.0393701;
const INCH_TO_MM = 25.4;

function inchToMM(inch) {
    return inch * INCH_TO_MM;
}

function mmToInch(mm) {
    return mm * MM_TO_INCH;
}

function convertConfigToInches(config, fromImperial) {
    if (fromImperial) return config; // Already in inches
    return {
        ...config,
        cardWidth: mmToInch(config.cardWidth),
        cardHeight: mmToInch(config.cardHeight)
    };
}

function convertConfigToMM(config, fromImperial) {
    if (!fromImperial) return config; // Already in mm
    return {
        ...config,
        cardWidth: inchToMM(config.cardWidth),
        cardHeight: inchToMM(config.cardHeight)
    };
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

function saveConfig() {
    const configToSave = {
        ...state.config,
        isImperial: state.isImperial
    };
    localStorage.setItem('cardTemplaterConfig', JSON.stringify(configToSave));
}

function loadConfig() {
    const saved = localStorage.getItem('cardTemplaterConfig');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.isImperial = parsed.isImperial !== undefined ? parsed.isImperial : true;
            delete parsed.isImperial;
            state.config = { ...state.config, ...parsed };
            return true;
        } catch (e) {
            console.error('Failed to load config:', e);
        }
    }
    return false;
}

// ============================================================================
// UI INITIALIZATION & UPDATES
// ============================================================================

function updateUIFromState() {
    const config = state.isImperial ? state.config : convertConfigToMM(state.config, true);

    document.getElementById('paperSize').value = state.config.paperSize;
    document.getElementById('cardPreset').value = state.config.cardPreset;
    document.getElementById('cardWidth').value = config.cardWidth.toFixed(2);
    document.getElementById('cardHeight').value = config.cardHeight.toFixed(2);
    document.getElementById('gridRows').value = state.config.gridRows;
    document.getElementById('gridCols').value = state.config.gridCols;
    document.getElementById('showCutLines').checked = state.config.showCutLines;
    document.getElementById('fullPageMode').checked = state.config.fullPageMode;

    // Enable/disable card dimension inputs based on preset
    const isCustom = state.config.cardPreset === 'custom';
    document.getElementById('cardWidth').readOnly = !isCustom;
    document.getElementById('cardHeight').readOnly = !isCustom;
    if (!isCustom) {
        document.getElementById('cardWidth').classList.add('bg-gray-100');
        document.getElementById('cardHeight').classList.add('bg-gray-100');
    } else {
        document.getElementById('cardWidth').classList.remove('bg-gray-100');
        document.getElementById('cardHeight').classList.remove('bg-gray-100');
    }

    // Update unit buttons
    if (state.isImperial) {
        document.getElementById('unitImperial').classList.add('bg-blue-600', 'text-white');
        document.getElementById('unitImperial').classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('unitMetric').classList.remove('bg-blue-600', 'text-white');
        document.getElementById('unitMetric').classList.add('bg-gray-200', 'text-gray-700');
    } else {
        document.getElementById('unitMetric').classList.add('bg-blue-600', 'text-white');
        document.getElementById('unitMetric').classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('unitImperial').classList.remove('bg-blue-600', 'text-white');
        document.getElementById('unitImperial').classList.add('bg-gray-200', 'text-gray-700');
    }
}

function readConfigFromUI() {
    let config = {
        paperSize: document.getElementById('paperSize').value,
        cardPreset: document.getElementById('cardPreset').value,
        cardWidth: parseFloat(document.getElementById('cardWidth').value),
        cardHeight: parseFloat(document.getElementById('cardHeight').value),
        gridRows: parseInt(document.getElementById('gridRows').value),
        gridCols: parseInt(document.getElementById('gridCols').value),
        showCutLines: document.getElementById('showCutLines').checked,
        fullPageMode: document.getElementById('fullPageMode').checked
    };

    // Convert to inches for internal storage
    if (!state.isImperial) {
        config = convertConfigToInches(config, false);
    }

    state.config = config;
    saveConfig();
}

function handleCardPresetChange() {
    const preset = document.getElementById('cardPreset').value;

    if (preset !== 'custom' && CARD_PRESETS[preset]) {
        // Update card dimensions based on preset
        const presetData = CARD_PRESETS[preset];

        // Update state with preset dimensions (always stored in inches)
        state.config.cardPreset = preset;
        state.config.cardWidth = presetData.width;
        state.config.cardHeight = presetData.height;

        // Update UI
        updateUIFromState();
        saveConfig();
        updatePreview();
    } else {
        // Custom mode - just update the preset value
        state.config.cardPreset = 'custom';
        updateUIFromState();
        saveConfig();
    }
}

// ============================================================================
// FILE UPLOAD HANDLING
// ============================================================================

function handleFiles(files, isFront) {
    const imageArray = isFront ? state.frontImages : state.backImages;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                imageArray.push(img);
                updateFileCount(isFront);
                updatePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateFileCount(isFront) {
    const count = isFront ? state.frontImages.length : state.backImages.length;
    const element = document.getElementById(isFront ? 'frontFileCount' : 'backFileCount');
    element.textContent = count === 0 ? 'No files selected' : `${count} file${count > 1 ? 's' : ''} selected`;
}

function setupUploadZone(zoneId, inputId, isFront) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    // Click to upload
    zone.addEventListener('click', () => input.click());

    // File input change
    input.addEventListener('change', (e) => {
        // Don't clear - add to existing images
        handleFiles(e.target.files, isFront);
        // Reset input value so the same file can be selected again
        e.target.value = '';
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        // Don't clear - add to existing images
        handleFiles(e.dataTransfer.files, isFront);
    });
}

// ============================================================================
// PREVIEW RENDERING
// ============================================================================

function updatePreview() {
    const container = document.getElementById('previewContainer');

    if (state.frontImages.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-20">Upload images to see preview</p>';
        return;
    }

    readConfigFromUI();
    const pages = generatePageData();

    container.innerHTML = '';

    pages.forEach((page, pageIndex) => {
        const paperSize = PAPER_SIZES[state.config.paperSize];
        const aspectRatio = paperSize[0] / paperSize[1];

        // Scale to fit container (max 600px wide)
        const maxWidth = 600;
        const pageWidth = maxWidth;
        const pageHeight = pageWidth / aspectRatio;

        // Create page container
        const pageContainer = document.createElement('div');
        pageContainer.className = 'preview-page-container';
        pageContainer.style.width = `${pageWidth}px`;
        pageContainer.style.height = `${pageHeight}px`;

        // Scale factor from inches to pixels
        const scale = pageWidth / paperSize[0];

        // Create cut lines canvas if needed
        if (state.config.showCutLines) {
            const cutLinesCanvas = createCutLinesCanvas(pageWidth, pageHeight, scale);
            pageContainer.appendChild(cutLinesCanvas);
        }

        // Add card slots
        page.images.forEach((imgData, slotIndex) => {
            const slot = createCardSlot(imgData, scale, pageIndex, slotIndex);
            pageContainer.appendChild(slot);
        });

        // Add page label
        const label = document.createElement('p');
        label.className = 'text-center text-sm text-gray-600 mt-2 mb-4';
        label.textContent = `Page ${pageIndex + 1} - ${page.label}`;

        container.appendChild(pageContainer);
        container.appendChild(label);
    });
}

function createCutLinesCanvas(pageWidth, pageHeight, scale) {
    const canvas = document.createElement('canvas');
    canvas.className = 'cut-lines';
    canvas.width = pageWidth;
    canvas.height = pageHeight;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    const { gridRows, gridCols, cardWidth, cardHeight } = state.config;
    const { topMargin, sideMargin } = calculateMargins();
    const hLineLength = sideMargin / 2;
    const vLineLength = topMargin / 2;

    // Horizontal cut lines
    for (let r = 0; r <= gridRows; r++) {
        const y = (topMargin + r * cardHeight) * scale;
        // Left
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(hLineLength * scale, y);
        ctx.stroke();
        // Right
        ctx.beginPath();
        ctx.moveTo(pageWidth - hLineLength * scale, y);
        ctx.lineTo(pageWidth, y);
        ctx.stroke();
    }

    // Vertical cut lines
    for (let c = 0; c <= gridCols; c++) {
        const x = (sideMargin + c * cardWidth) * scale;
        // Bottom
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, vLineLength * scale);
        ctx.stroke();
        // Top
        ctx.beginPath();
        ctx.moveTo(x, pageHeight - vLineLength * scale);
        ctx.lineTo(x, pageHeight);
        ctx.stroke();
    }

    return canvas;
}

function createCardSlot(imgData, scale, pageIndex, slotIndex) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.style.left = `${imgData.x * scale}px`;
    slot.style.top = `${imgData.y * scale}px`;
    slot.style.width = `${imgData.width * scale}px`;
    slot.style.height = `${imgData.height * scale}px`;

    // Store metadata
    slot.dataset.pageIndex = pageIndex;
    slot.dataset.slotIndex = slotIndex;
    slot.dataset.imageIndex = imgData.imageIndex;
    slot.dataset.isFront = imgData.isFront;

    if (imgData.img) {
        // Add image
        const img = document.createElement('img');
        img.src = imgData.img.src;
        slot.appendChild(img);

        // Add delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'card-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteImageFromSlot(imgData);
        });
        slot.appendChild(deleteBtn);

        // Make draggable
        slot.draggable = true;
        slot.addEventListener('dragstart', handleCardDragStart);
        slot.addEventListener('dragend', handleCardDragEnd);
        slot.addEventListener('dragover', handleCardDragOver);
        slot.addEventListener('drop', handleCardDrop);
    }

    return slot;
}

function deleteImageFromSlot(imgData) {
    const isFront = imgData.isFront;
    const imageArray = isFront ? state.frontImages : state.backImages;
    const imageIndex = imgData.imageIndex;

    imageArray.splice(imageIndex, 1);
    updateFileCount(isFront);
    updatePreview();
}

let draggedCardSlot = null;

function handleCardDragStart(e) {
    draggedCardSlot = e.target;
    draggedCardSlot.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleCardDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCardSlot = null;
}

function handleCardDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleCardDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCardSlot) return;

    const targetSlot = e.target.closest('.card-slot');
    if (!targetSlot || targetSlot === draggedCardSlot) return;

    // Only allow swapping within same front/back type
    const draggedIsFront = draggedCardSlot.dataset.isFront === 'true';
    const targetIsFront = targetSlot.dataset.isFront === 'true';

    if (draggedIsFront !== targetIsFront) return;

    // Swap images in the array
    const draggedIndex = parseInt(draggedCardSlot.dataset.imageIndex);
    const targetIndex = parseInt(targetSlot.dataset.imageIndex);

    const imageArray = draggedIsFront ? state.frontImages : state.backImages;
    [imageArray[draggedIndex], imageArray[targetIndex]] = [imageArray[targetIndex], imageArray[draggedIndex]];

    // Re-render
    updatePreview();
}

// ============================================================================
// PAGE GENERATION LOGIC
// ============================================================================

function generatePageData() {
    const pages = [];
    const { gridRows, gridCols, cardWidth, cardHeight, fullPageMode } = state.config;
    const { topMargin, sideMargin } = calculateMargins();
    const cardsPerPage = gridRows * gridCols;

    if (fullPageMode) {
        // Full page mode: each image gets its own full page
        state.frontImages.forEach((img, imgIndex) => {
            const pageImages = [];
            for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                    pageImages.push({
                        img: img,
                        x: sideMargin + c * cardWidth,
                        y: topMargin + r * cardHeight,
                        width: cardWidth,
                        height: cardHeight,
                        imageIndex: imgIndex,
                        isFront: true
                    });
                }
            }
            pages.push({
                images: pageImages,
                label: `Front ${imgIndex + 1}`
            });
        });

        // If there's exactly one back image, repeat it for each front image
        if (state.backImages.length === 1) {
            const backImg = state.backImages[0];
            state.frontImages.forEach((frontImg, frontIndex) => {
                const pageImages = [];
                for (let r = 0; r < gridRows; r++) {
                    for (let c = 0; c < gridCols; c++) {
                        pageImages.push({
                            img: backImg,
                            x: sideMargin + c * cardWidth,
                            y: topMargin + r * cardHeight,
                            width: cardWidth,
                            height: cardHeight,
                            imageIndex: 0, // Always refers to the single back image
                            isFront: false
                        });
                    }
                }
                pages.push({
                    images: pageImages,
                    label: `Back ${frontIndex + 1}`
                });
            });
        } else {
            // Multiple back images - one page per image
            state.backImages.forEach((img, imgIndex) => {
                const pageImages = [];
                for (let r = 0; r < gridRows; r++) {
                    for (let c = 0; c < gridCols; c++) {
                        pageImages.push({
                            img: img,
                            x: sideMargin + c * cardWidth,
                            y: topMargin + r * cardHeight,
                            width: cardWidth,
                            height: cardHeight,
                            imageIndex: imgIndex,
                            isFront: false
                        });
                    }
                }
                pages.push({
                    images: pageImages,
                    label: `Back ${imgIndex + 1}`
                });
            });
        }
    } else {
        // Ordered mode: fill pages with images in order, interleaving front and back
        const numFrontPages = Math.ceil(state.frontImages.length / cardsPerPage);

        for (let pageNum = 0; pageNum < numFrontPages; pageNum++) {
            // Create front page
            const frontPageImages = [];
            let cardIndex = 0;
            for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                    const imgIndex = pageNum * cardsPerPage + cardIndex;
                    if (imgIndex < state.frontImages.length) {
                        frontPageImages.push({
                            img: state.frontImages[imgIndex],
                            x: sideMargin + c * cardWidth,
                            y: topMargin + r * cardHeight,
                            width: cardWidth,
                            height: cardHeight,
                            imageIndex: imgIndex,
                            isFront: true
                        });
                    } else {
                        // Empty slot
                        frontPageImages.push({
                            img: null,
                            x: sideMargin + c * cardWidth,
                            y: topMargin + r * cardHeight,
                            width: cardWidth,
                            height: cardHeight,
                            imageIndex: -1,
                            isFront: true
                        });
                    }
                    cardIndex++;
                }
            }
            pages.push({
                images: frontPageImages,
                label: `Front ${pageNum + 1}`
            });

            // Create corresponding back page if back images exist
            if (state.backImages.length > 0) {
                const backPageImages = [];
                cardIndex = 0;

                // If there's exactly one back image, use it for all slots on all back pages
                const useSingleBackImage = state.backImages.length === 1;

                for (let r = 0; r < gridRows; r++) {
                    for (let c = 0; c < gridCols; c++) {
                        const frontImgIndex = pageNum * cardsPerPage + cardIndex;

                        if (useSingleBackImage) {
                            // Use the single back image only where there's a corresponding front image
                            if (frontImgIndex < state.frontImages.length) {
                                backPageImages.push({
                                    img: state.backImages[0],
                                    x: sideMargin + c * cardWidth,
                                    y: topMargin + r * cardHeight,
                                    width: cardWidth,
                                    height: cardHeight,
                                    imageIndex: 0,
                                    isFront: false
                                });
                            } else {
                                // Empty slot (no corresponding front image)
                                backPageImages.push({
                                    img: null,
                                    x: sideMargin + c * cardWidth,
                                    y: topMargin + r * cardHeight,
                                    width: cardWidth,
                                    height: cardHeight,
                                    imageIndex: -1,
                                    isFront: false
                                });
                            }
                        } else {
                            // Multiple back images - use sequential order
                            const imgIndex = pageNum * cardsPerPage + cardIndex;
                            if (imgIndex < state.backImages.length) {
                                backPageImages.push({
                                    img: state.backImages[imgIndex],
                                    x: sideMargin + c * cardWidth,
                                    y: topMargin + r * cardHeight,
                                    width: cardWidth,
                                    height: cardHeight,
                                    imageIndex: imgIndex,
                                    isFront: false
                                });
                            } else {
                                // Empty slot
                                backPageImages.push({
                                    img: null,
                                    x: sideMargin + c * cardWidth,
                                    y: topMargin + r * cardHeight,
                                    width: cardWidth,
                                    height: cardHeight,
                                    imageIndex: -1,
                                    isFront: false
                                });
                            }
                        }
                        cardIndex++;
                    }
                }
                pages.push({
                    images: backPageImages,
                    label: `Back ${pageNum + 1}`
                });
            }
        }
    }

    return pages;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

async function generatePDF() {
    if (state.frontImages.length === 0) {
        alert('Please upload at least one front image');
        return;
    }

    readConfigFromUI();
    const pages = generatePageData();
    const { jsPDF } = window.jspdf;
    const paperSize = PAPER_SIZES[state.config.paperSize];

    // jsPDF uses points (72 points = 1 inch)
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: paperSize
    });

    let firstPage = true;

    for (const page of pages) {
        if (!firstPage) {
            pdf.addPage(paperSize, 'portrait');
        }
        firstPage = false;

        // Draw images
        for (const imgData of page.images) {
            if (imgData.img) {
                // Use the original data URL to preserve encoding
                // jsPDF automatically deduplicates images with the same data URL
                const imgSrc = imgData.img.src;
                const imageFormat = imgSrc.startsWith('data:image/png') ? 'PNG' :
                                   imgSrc.startsWith('data:image/jpeg') || imgSrc.startsWith('data:image/jpg') ? 'JPEG' :
                                   'PNG'; // default fallback

                pdf.addImage(
                    imgSrc,
                    imageFormat,
                    imgData.x,
                    imgData.y,
                    imgData.width,
                    imgData.height
                );
            }
        }

        // Draw cut lines
        if (state.config.showCutLines) {
            const { gridRows, gridCols, cardWidth, cardHeight } = state.config;
            const { topMargin, sideMargin } = calculateMargins();
            const hLineLength = sideMargin / 2;
            const vLineLength = topMargin / 2;

            pdf.setLineWidth(0.01);
            pdf.setDrawColor(0, 0, 0);

            // Horizontal cut lines
            for (let r = 0; r <= gridRows; r++) {
                const y = topMargin + r * cardHeight;
                // Left
                pdf.line(0, y, hLineLength, y);
                // Right
                pdf.line(paperSize[0] - hLineLength, y, paperSize[0], y);
            }

            // Vertical cut lines
            for (let c = 0; c <= gridCols; c++) {
                const x = sideMargin + c * cardWidth;
                // Bottom
                pdf.line(x, 0, x, vLineLength);
                // Top
                pdf.line(x, paperSize[1] - vLineLength, x, paperSize[1]);
            }
        }
    }

    pdf.save('business-cards.pdf');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Load saved config
    loadConfig();
    updateUIFromState();

    // Setup upload zones
    setupUploadZone('frontUploadZone', 'frontFileInput', true);
    setupUploadZone('backUploadZone', 'backFileInput', false);

    // Unit toggle
    document.getElementById('unitImperial').addEventListener('click', () => {
        if (!state.isImperial) {
            state.isImperial = true;
            updateUIFromState();
            saveConfig();
        }
    });

    document.getElementById('unitMetric').addEventListener('click', () => {
        if (state.isImperial) {
            state.isImperial = false;
            updateUIFromState();
            saveConfig();
        }
    });

    // Card preset change handler
    document.getElementById('cardPreset').addEventListener('change', handleCardPresetChange);

    // Card dimension manual changes should set preset to custom
    ['cardWidth', 'cardHeight'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            if (state.config.cardPreset !== 'custom') {
                state.config.cardPreset = 'custom';
                document.getElementById('cardPreset').value = 'custom';
                updateUIFromState();
            }
            readConfigFromUI();
            updatePreview();
        });
    });

    // Config changes trigger preview update
    const configInputs = [
        'paperSize', 'gridRows', 'gridCols', 'showCutLines', 'fullPageMode'
    ];

    configInputs.forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('change', () => {
            readConfigFromUI();
            updatePreview();
        });
        element.addEventListener('input', () => {
            readConfigFromUI();
            updatePreview();
        });
    });

    // Generate PDF button
    document.getElementById('generatePDF').addEventListener('click', generatePDF);
});
