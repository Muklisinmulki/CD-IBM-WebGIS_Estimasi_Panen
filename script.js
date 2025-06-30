// Inisialisasi peta dengan zoom maksimum 24
const map = L.map('map', {
    maxZoom: 24 ,
    preferCanvas: true
}).setView([-2.5489, 118.0149], 5);

// Ganti tile layer ke Google Satellite
L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Ultra-High Resolution Provider',
    maxZoom: 24, // Experimental ultra zoom
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
}).addTo(map);

// Variabel global untuk menyimpan polygon dan fitur yang digambar
let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
let currentPolygon = null;

// Referensi ke elemen DOM
const drawPolygonBtn = document.getElementById('drawPolygon');
const clearPolygonBtn = document.getElementById('clearPolygon');
const calculateBtn = document.getElementById('calculate');
const generateReportBtn = document.getElementById('generateReport');
const areaSizeSpan = document.getElementById('areaSize');
const coordinatesList = document.getElementById('coordinatesList');
const userForm = document.getElementById('userForm');
const savePolygonBtn = document.getElementById('savePolygonBtn');
const zoomToPolygonBtn = document.getElementById('zoomToPolygonBtn');

// Style untuk polygon
const polygonStyle = {
    color: '#EF5350',  
    weight: 3,
    opacity: 0.8,
    fillColor: '#FFCDD2',  
    fillOpacity: 0.5
};

// Inisialisasi fitur menggambar
const drawControl = new L.Control.Draw({
    draw: {
        polygon: {
            shapeOptions: polygonStyle,
            allowIntersection: false,
            drawError: {
                color: '#e1e100',
                message: '<strong>Error:</strong> bentuk tepi tidak boleh bersilangan!'
            },
            showArea: true,
            metric: true,
            guidelineDistance: 20,
            showLength: true,
            precision: 5
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems,
        edit: {
            selectedPathOptions: {
                color: '#FF5722',
                dashArray: '10, 10'
            }
        }
    }
});

// Event listener untuk tombol gambar polygon
drawPolygonBtn.addEventListener('click', function() {
    map.addControl(drawControl);
    new L.Draw.Polygon(map, drawControl.options.draw.polygon).enable();
});

// Event listener untuk tombol hapus polygon
clearPolygonBtn.addEventListener('click', function() {
    drawnItems.clearLayers();
    areaSizeSpan.textContent = '0';
    coordinatesList.innerHTML = '';
    currentPolygon = null;
    showNotification('Polygon telah dihapus', 'info');
});

// Event listener untuk tombol simpan polygon
savePolygonBtn.addEventListener('click', function() {
    if (!currentPolygon) {
        showNotification('Tidak ada polygon untuk disimpan', 'warning');
        return;
    }
    
    const area = L.GeometryUtil.geodesicArea(currentPolygon.getLatLngs()[0]);
    const areaInHectares = (area / 10000).toFixed(2);
    
    const popupContent = `
        <div class="p-2">
            <h3 class="font-bold text-green-600 mb-1">Informasi Lahan Tersimpan</h3>
            <p class="text-sm"><strong>Luas:</strong> ${areaInHectares} hektar</p>
            <p class="text-sm"><strong>Jumlah Titik:</strong> ${currentPolygon.getLatLngs()[0].length}</p>
            <p class="text-sm text-green-600 mt-1"><i class="fas fa-check-circle mr-1"></i> Polygon telah disimpan</p>
        </div>
    `;
    
    currentPolygon.bindPopup(popupContent).openPopup();
    showNotification('Polygon berhasil disimpan', 'success');
});

// Event listener untuk tombol zoom ke polygon
zoomToPolygonBtn.addEventListener('click', function() {
    if (!currentPolygon) {
        showNotification('Tidak ada polygon untuk di-zoom', 'warning');
        return;
    }
    
    map.fitBounds(currentPolygon.getBounds(), {
        padding: [50, 50],
        maxZoom: 24  // Update maxZoom untuk fitBounds
    });
    
    showNotification('Zoom ke polygon', 'info');
});

// Event listener ketika pengguna selesai menggambar
map.on(L.Draw.Event.CREATED, function(e) {
    const type = e.layerType;
    const layer = e.layer;
    
    if (type === 'polygon') {
        drawnItems.clearLayers();
        layer.setStyle(polygonStyle);
        drawnItems.addLayer(layer);
        currentPolygon = layer;
        updateAreaInfo(layer);
        showNotification('Polygon berhasil dibuat', 'success');
        map.fitBounds(layer.getBounds(), {
            padding: [50, 50],
            maxZoom: 24  // Update maxZoom untuk fitBounds
        });
    }
    
    map.removeControl(drawControl);
});

// Event listener ketika polygon diubah
map.on(L.Draw.Event.EDITED, function(e) {
    const layers = e.layers;
    layers.eachLayer(function(layer) {
        if (layer instanceof L.Polygon) {
            currentPolygon = layer;
            updateAreaInfo(layer);
            showNotification('Polygon berhasil diubah', 'success');
        }
    });
});

// Fungsi untuk memperbarui informasi area
function updateAreaInfo(polygon) {
    const area = L.GeometryUtil.geodesicArea(polygon.getLatLngs()[0]);
    const areaInHectares = (area / 10000).toFixed(2);
    areaSizeSpan.textContent = areaInHectares;
    
    const coordinates = polygon.getLatLngs()[0];
    let coordinatesHtml = '';
    coordinates.forEach((coord, index) => {
        coordinatesHtml += `<div class="py-1 border-b border-gray-100">${index+1}. ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}</div>`;
    });
    coordinatesList.innerHTML = coordinatesHtml;
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${getIconForType(type)} mr-2"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 2500);
}

function getIconForType(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Event listener untuk tombol hitung estimasi panen
userForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentPolygon) {
        showNotification('Silakan gambar area lahan terlebih dahulu!', 'warning');
        return;
    }
    
    const nama = document.getElementById('nama').value;
    const email = document.getElementById('email').value;
    const lokasi = document.getElementById('lokasi').value;
    const jenisTanaman = document.getElementById('jenisTanaman').value;
    const luasArea = areaSizeSpan.textContent;
    
    if (!nama || !email || !jenisTanaman) {
        showNotification('Harap isi semua field yang diperlukan!', 'error');
        return;
    }
    
    let hasilEstimasi = 0;
    let satuan = 'ton';
    switch(jenisTanaman) {
        case 'padi':
            hasilEstimasi = (luasArea * 5).toFixed(2);
            break;
        case 'jagung':
            hasilEstimasi = (luasArea * 7).toFixed(2);
            break;
        case 'kedelai':
            hasilEstimasi = (luasArea * 2).toFixed(2);
            break;
        case 'sayuran':
            hasilEstimasi = (luasArea * 10).toFixed(2);
            satuan = 'ton (bervariasi)';
            break;
        default:
            hasilEstimasi = 0;
    }
    
    const popupContent = `
        <div class="p-2">
            <h3 class="font-bold text-green-600 mb-2">Hasil Estimasi Panen</h3>
            <p class="text-sm"><strong>Jenis Tanaman:</strong> ${jenisTanaman}</p>
            <p class="text-sm"><strong>Luas Lahan:</strong> ${luasArea} hektar</p>
            <p class="text-sm font-bold"><strong>Estimasi Hasil:</strong> ${hasilEstimasi} ${satuan}</p>
            <p class="text-xs text-gray-600 mt-2"><i class="fas fa-chart-line mr-1"></i> Estimasi berdasarkan rata-rata produktivitas</p>
        </div>
    `;
    
    currentPolygon.bindPopup(popupContent).openPopup();
    showNotification(`Estimasi panen: ${hasilEstimasi} ${satuan}`, 'success');
});

// Event listener untuk tombol generate laporan PDF dengan gambar peta dan polygon
generateReportBtn.addEventListener('click', async function() {
    if (!currentPolygon) {
        showNotification('Silakan gambar area lahan terlebih dahulu!', 'warning');
        return;
    }
    
    const nama = document.getElementById('nama').value;
    const email = document.getElementById('email').value;
    const lokasi = document.getElementById('lokasi').value;
    const jenisTanaman = document.getElementById('jenisTanaman').value;
    const luasArea = areaSizeSpan.textContent;
    
    if (!nama || !email || !jenisTanaman) {
        showNotification('Harap isi semua field yang diperlukan!', 'error');
        return;
    }
    
    // Hitung estimasi panen
    let hasilEstimasi = 0;
    let satuan = 'ton';
    let produktivitas = 0;
    
    switch(jenisTanaman) {
        case 'padi':
            hasilEstimasi = (luasArea * 5).toFixed(2);
            produktivitas = 5;
            break;
        case 'jagung':
            hasilEstimasi = (luasArea * 7).toFixed(2);
            produktivitas = 7;
            break;
        case 'kedelai':
            hasilEstimasi = (luasArea * 2).toFixed(2);
            produktivitas = 2;
            break;
        case 'sayuran':
            hasilEstimasi = (luasArea * 10).toFixed(2);
            produktivitas = 10;
            satuan = 'ton (bervariasi)';
            break;
        default:
            hasilEstimasi = 0;
    }
    
    showNotification('Sedang membuat laporan PDF...', 'info');
    
    // Buat PDF baru
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Pengaturan margin
    const margin = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (margin * 2);
    
    let currentY = margin;
    
    // === HEADER SECTION ===
    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN ESTIMASI PANEN', pageWidth/2, 15, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistem Informasi Geografis Pertanian', pageWidth/2, 22, { align: 'center' });
    
    // Date
    const reportDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    doc.setFontSize(10);
    doc.text(`Tanggal: ${reportDate}`, pageWidth/2, 29, { align: 'center' });
    
    currentY = 50;
    
    // === INFORMASI PENGGUNA SECTION ===
    // Section header
    doc.setFillColor(232, 245, 233);
    doc.rect(margin, currentY - 5, contentWidth, 10, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(27, 94, 32);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI PENGGUNA', margin + 5, currentY);
    
    currentY += 10;
    
    // User info box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(margin, currentY, contentWidth, 30, 'S');
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // User details
    const userDetails = [
        { label: 'Nama Petani', value: nama },
        { label: 'Email', value: email },
        { label: 'Lokasi Lahan', value: lokasi || 'Tidak disebutkan' },
        { label: 'Jenis Tanaman', value: jenisTanaman.charAt(0).toUpperCase() + jenisTanaman.slice(1) }
    ];
    
    let detailY = currentY + 7;
    userDetails.forEach(detail => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${detail.label}:`, margin + 5, detailY);
        doc.setFont('helvetica', 'normal');
        doc.text(detail.value, margin + 50, detailY);
        detailY += 6;
    });
    
    currentY += 40;
    
    // === HASIL ESTIMASI SECTION ===
    doc.setFillColor(255, 243, 224);
    doc.rect(margin, currentY - 5, contentWidth, 10, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(230, 81, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('HASIL ESTIMASI PANEN', margin + 5, currentY);
    
    currentY += 15;
    
    // Main result box
    doc.setFillColor(76, 175, 80);
    doc.rect(margin, currentY, contentWidth, 25, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`${hasilEstimasi} ${satuan}`, pageWidth/2, currentY + 12, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Estimasi Hasil Panen', pageWidth/2, currentY + 20, { align: 'center' });
    
    currentY += 35;
    
    // Detail boxes
    const boxWidth = (contentWidth - 10) / 3;
    const boxHeight = 20;
    
    // Box 1 - Luas Area
    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(33, 150, 243);
    doc.rect(margin, currentY, boxWidth, boxHeight, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(33, 150, 243);
    doc.setFont('helvetica', 'bold');
    doc.text('LUAS AREA', margin + boxWidth/2, currentY + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${luasArea} ha`, margin + boxWidth/2, currentY + 15, { align: 'center' });
    
    // Box 2 - Produktivitas
    const box2X = margin + boxWidth + 5;
    doc.setFillColor(248, 255, 240);
    doc.setDrawColor(76, 175, 80);
    doc.rect(box2X, currentY, boxWidth, boxHeight, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(76, 175, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUKTIVITAS', box2X + boxWidth/2, currentY + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${produktivitas} ton/ha`, box2X + boxWidth/2, currentY + 15, { align: 'center' });
    
    // Box 3 - Estimasi Nilai
    const box3X = margin + (boxWidth + 5) * 2;
    const estimatedPrice = (hasilEstimasi * 5500000).toLocaleString('id-ID');
    doc.setFillColor(255, 248, 240);
    doc.setDrawColor(255, 152, 0);
    doc.rect(box3X, currentY, boxWidth, boxHeight, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(255, 152, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('EST. NILAI', box3X + boxWidth/2, currentY + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rp ${estimatedPrice}`, box3X + boxWidth/2, currentY + 15, { align: 'center' });
    
    currentY += 30;
    
    // Disclaimer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('*Estimasi harga berdasarkan rata-rata pasar (dapat bervariasi)', margin, currentY);
    
    currentY += 15;
    
    try {
        // === PETA LAHAN SECTION ===
        doc.setFillColor(240, 248, 255);
        doc.rect(margin, currentY - 5, contentWidth, 10, 'F');
        
        doc.setFontSize(14);
        doc.setTextColor(33, 150, 243);
        doc.setFont('helvetica', 'bold');
        doc.text('PETA LAHAN', margin + 5, currentY);
        
        currentY += 15;
        
        // Simpan posisi dan zoom saat ini
        const originalCenter = map.getCenter();
        const originalZoom = map.getZoom();
        
        // Zoom ke polygon dengan padding
        map.fitBounds(currentPolygon.getBounds(), {
            padding: [50, 50],
            maxZoom: 18
        });
        
        // Tunggu sebentar untuk memastikan peta selesai di-render
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ambil screenshot peta
        const mapElement = document.getElementById('map');
        const canvas = await html2canvas(mapElement, {
            scale: 1.5,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });
        
        // Kembalikan ke posisi dan zoom semula
        map.setView(originalCenter, originalZoom);
        
        // Tambahkan gambar ke PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Pastikan gambar tidak melebihi tinggi halaman
        const maxHeight = pageHeight - currentY - 30;
        if (imgHeight > maxHeight) {
            const ratio = maxHeight / imgHeight;
            doc.addImage(imgData, 'JPEG', margin, currentY, imgWidth * ratio, maxHeight);
            currentY += maxHeight + 10;
        } else {
            doc.addImage(imgData, 'JPEG', margin, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
        }
        
    } catch (error) {
        console.error('Error generating map image:', error);
        doc.setFontSize(10);
        doc.setTextColor(255, 0, 0);
        doc.text('Gagal memuat gambar peta', margin, currentY);
        currentY += 10;
    }
    
    // === KOORDINAT SECTION ===
    if (currentY > 200) {
        doc.addPage();
        currentY = margin;
    }
    
    doc.setFillColor(248, 255, 240);
    doc.rect(margin, currentY - 5, contentWidth, 10, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(76, 175, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('KOORDINAT LAHAN', margin + 5, currentY);
    
    currentY += 15;
    
    // Koordinat table
    const coordinates = currentPolygon.getLatLngs()[0];
    const maxCoords = Math.min(coordinates.length, 10);
    
    // Table header
    doc.setFillColor(76, 175, 80);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('No.', margin + 15, currentY + 5, { align: 'center' });
    doc.text('Latitude', margin + contentWidth/2 - 30, currentY + 5, { align: 'center' });
    doc.text('Longitude', margin + contentWidth/2 + 30, currentY + 5, { align: 'center' });
    
    currentY += 8;
    
    // Table data
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    for (let i = 0; i < maxCoords; i++) {
        const coord = coordinates[i];
        const bgColor = i % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
        
        doc.setFillColor(...bgColor);
        doc.rect(margin, currentY, contentWidth, 6, 'F');
        
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, currentY, margin + contentWidth, currentY);
        
        doc.text(`${i + 1}`, margin + 15, currentY + 4, { align: 'center' });
        doc.text(coord.lat.toFixed(6), margin + contentWidth/2 - 30, currentY + 4, { align: 'center' });
        doc.text(coord.lng.toFixed(6), margin + contentWidth/2 + 30, currentY + 4, { align: 'center' });
        
        currentY += 6;
    }
    
    // Table border
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, currentY - (maxCoords * 6) - 8, contentWidth, (maxCoords * 6) + 8, 'S');
    
    if (coordinates.length > maxCoords) {
        currentY += 5;
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`...dan ${coordinates.length - maxCoords} titik koordinat lainnya`, margin, currentY);
    }
    
    // === FOOTER ===
    const footerY = pageHeight - 20;
    
    doc.setDrawColor(76, 175, 80);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, margin + contentWidth, footerY);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistem Estimasi Panen GIS', margin, footerY + 7);
    doc.text(`Dibuat pada: ${new Date().toLocaleString('id-ID')}`, margin + contentWidth - 60, footerY + 7);
    
    // Save PDF
    const fileName = `Laporan_Estimasi_Panen_${nama.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    showNotification('Laporan PDF berhasil diunduh!', 'success');
});