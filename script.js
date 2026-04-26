let map;
let marker;

const app = {
    state: {
        headName: '',
        mobile: '',
        email: '',
        targetScreen: '',
        targetStep: 1,
        isLoggedIn: false
    },

    // Utilities
    goToScreen: function(screenId, stepNum = null) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        if (stepNum !== null) {
            this.updateStepper(stepNum);
            
            // Initialize map only when location screen is shown to fix Leaflet rendering issues
            if (screenId === 'screen-location' && !map) {
                setTimeout(() => {
                    this.initMap();
                }, 100);
            }
        }

        if (screenId === 'screen-submit') {
            this.populateSummary();
        }
        
        window.scrollTo(0, 0);
    },

    updateStepper: function(stepNum) {
        document.getElementById('stepperContainer').style.display = 'block';
        for(let i=1; i<=6; i++) {
            const stepEl = document.getElementById(`step${i}`);
            if(stepEl) {
                // Clear both classes first
                stepEl.classList.remove('active', 'completed');
                
                if (i < stepNum) {
                    stepEl.classList.add('completed');
                    stepEl.classList.add('active'); // Keep active for blue color line
                } else if (i === stepNum) {
                    stepEl.classList.add('active');
                }
            }
        }
    },

    showModal: function(modalId) {
        document.getElementById(modalId).classList.add('show');
    },

    hideModal: function(modalId) {
        document.getElementById(modalId).classList.remove('show');
    },

    // Login Flow
    showExtendedLogin: function() {
        const state = document.getElementById('loginState').value;
        const captcha = document.getElementById('loginCaptcha').value;
        
        if(!state) {
            alert('कृपया राज्य / संघ क्षेत्र चुनें');
            return;
        }
        if(captcha.toUpperCase() !== 'A7X9P') {
            alert('कृपया सही कैप्चा दर्ज करें (A7X9P)');
            return;
        }

        document.getElementById('loginExtended').classList.remove('hidden');
        document.getElementById('loginNextBtn').classList.add('hidden');
    },

    goToOTP: function() {
        this.state.headName = document.getElementById('loginHeadName').value;
        this.state.mobile = document.getElementById('loginMobile').value;
        this.state.email = document.getElementById('loginEmail').value;
        
        document.getElementById('otpMobileDisplay').innerText = this.state.mobile;
        
        // Populate disabled fields in questionnaire
        if(document.getElementById('q11')) document.getElementById('q11').value = this.state.headName;
        if(document.getElementById('q34')) document.getElementById('q34').value = this.state.mobile;

        this.goToScreen('screen-otp');
    },

    checkRegistrationStatus: function() {
        // First check LocalStorage for instant response
        const savedData = localStorage.getItem(`census_se_${this.state.mobile}`);
        if (savedData) {
            const data = JSON.parse(savedData);
            this.showProfile(data);
            return;
        }

        // Use Latest URL
        const scriptURL = 'https://script.google.com/macros/s/AKfycbx4KkUWwkSSNFXLmQ8bUIYvLiiXnC4aOLkNWD2aXjdbrbS86er9oC4BICzfjWvoZPPb/exec';
        const callbackName = 'jsonpCallback_' + Math.round(100000 * Math.random());
        
        window[callbackName] = (res) => {
            // Clean up
            delete window[callbackName];
            const scriptTag = document.getElementById(callbackName);
            if (scriptTag) document.body.removeChild(scriptTag);

            if (res.status === 'success' && res.data && res.data.length > 0) {
                const data = res.data[0];
                localStorage.setItem(`census_se_${this.state.mobile}`, JSON.stringify(data));
                this.showProfile(data);
            } else {
                this.goToScreen('screen-location', 1);
            }
        };

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = `${scriptURL}?mobile=${this.state.mobile}&sheetName=Sheet2&callback=${callbackName}`;
        document.body.appendChild(script);
    },

    showProfile: function(data) {
        this.state.email = data.email || ""; // Restore email from data
        document.getElementById('prof-name').innerText = data.headName || "-";
        document.getElementById('prof-mobile').innerText = data.mobile || "-";
        document.getElementById('prof-email').innerText = data.email || "N/A";
        document.getElementById('prof-seid').innerText = data.id || data.seID || "-";
        this.goToScreen('screen-profile');
    },

    focusNext: function(elem, num) {
        if (elem.value.length === 1 && num < 4) {
            document.getElementById(`otp${num + 1}`).focus();
        }
    },

    verifyOTP: function() {
        const otp = document.getElementById('otp1').value + 
                    document.getElementById('otp2').value + 
                    document.getElementById('otp3').value + 
                    document.getElementById('otp4').value;
        
        if (otp.length === 4) {
            this.state.isLoggedIn = true;
            this.checkRegistrationStatus();
        } else {
            alert('कृपया 4 अंकों का OTP दर्ज करें');
        }
    },

    logout: function() {
        if(confirm('क्या आप निश्चित रूप से लॉग आउट करना चाहते हैं?')) {
            window.location.reload();
        }
    },

    // Real Map Simulation (Leaflet.js)
    initMap: function() {
        map = L.map('realMap').setView([26.4499, 74.6399], 12);
        L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains:['mt0','mt1','mt2','mt3'],
            attribution: '© Google'
        }).addTo(map);

        map.on('click', function(e) {
            if(marker) {
                map.removeLayer(marker);
            }
            marker = L.marker(e.latlng).addTo(map);
        });
    },

    searchLocation: function() {
        const area = document.getElementById('locArea').value;
        if(!area) {
            alert("स्थान दर्ज करें");
            return;
        }
        if(map) {
            const currentCenter = map.getCenter();
            const newLat = currentCenter.lat + (Math.random() * 0.05 - 0.025);
            const newLng = currentCenter.lng + (Math.random() * 0.05 - 0.025);
            map.flyTo([newLat, newLng], 15);
            if(marker) map.removeLayer(marker);
            marker = L.marker([newLat, newLng]).addTo(map);
        }
    },

    confirmLocation: function() {
        const dist = document.getElementById('locDistrict').value;
        const area = document.getElementById('locArea').value;
        if(!dist || !area || !marker) {
            alert('कृपया सभी आवश्यक फील्ड भरें और नक्शा चिह्नित करें।');
            return;
        }
        this.showModal('confirmLocModal');
    },

    proceedFromLocation: function() {
        this.hideModal('confirmLocModal');
        this.goToScreen('screen-q1', 2);
    },

    saveAndProceed: function(nextScreen, stepNum) {
        this.goToScreen(nextScreen, stepNum);
    },

    populateSummary: function() {
        const questionLabels = {
            "q4": "जनगणना मकान के फर्श में प्रयुक्त प्रमुख सामग्री",
            "q5": "जनगणना मकान के दीवार में प्रयुक्त प्रमुख सामग्री",
            "q6": "जनगणना मकान के छत में प्रयुक्त प्रमुख सामग्री",
            "q8": "मकान की स्थिति",
            "q10": "रहने वाले व्यक्तियों की संख्या",
            "q13": "जाति विवरण",
            "q14": "स्वामित्व की स्थिति",
            "q15": "उपलब्ध कमरों की संख्या",
            "q16": "विवाहित दम्पत्तियों की संख्या",
            "q17": "पेयजल का मुख्य स्रोत",
            "q18": "पेयजल स्रोत की उपलब्धता",
            "q19": "प्रकाश का मुख्य स्रोत",
            "q20": "शौचालय की सुलभता",
            "q21": "शौचालय का प्रकार",
            "q22": "गंदे पानी की निकासी",
            "q23": "स्नान सुविधा",
            "q24": "रसोई घर / एलपीजी",
            "q25": "मुख्य ईंधन",
            "q26": "रेadio/ट्रांजिस्टर",
            "q27": "टेलीविजन",
            "q28": "इंटरनेट सुविधा",
            "q29": "लैपटॉप/कंप्युटर",
            "q30": "टेलीफोन/मोबाइल",
            "q31": "वाहन (2-wheeler)",
            "q32": "कार/जीप/वैन",
            "q33": "मुख्य अनाज",
            "q34": "मोबाइल नम्बर"
        };

        const getVal = (id) => {
            const input = document.getElementById(id);
            if (!input) {
                const radios = document.getElementsByName(id);
                if (radios.length > 0) {
                    for (let r of radios) { if (r.checked) return r.parentElement.innerText.trim(); }
                    return "चयन नहीं किया";
                }
                return "-";
            }
            return input.value || "-";
        };

        document.getElementById('sum-headName').innerText = this.state.headName || "-";
        document.getElementById('sum-mobile').innerText = this.state.mobile || "-";
        
        let gender = "चयन नहीं किया";
        document.getElementsByName('q12').forEach(r => { if(r.checked) gender = r.parentElement.innerText.trim(); });
        document.getElementById('sum-gender').innerText = gender;
        
        document.getElementById('sum-state').innerText = document.getElementById('loginState')?.value || "-";
        document.getElementById('sum-district').innerText = document.getElementById('locDistrict')?.value || "-";
        document.getElementById('sum-area').innerText = document.getElementById('locArea')?.value || "-";
        
        let html = "";
        const sections = [
            { title: "🏠 जनगणना मकान का विवरण", range: [4, 8] },
            { title: "👥 सामान्य जानकारी", range: [10, 16] },
            { title: "💧 सुविधाएं", range: [17, 25] },
            { title: "📦 परिसंपत्तियां", range: [26, 34] }
        ];

        sections.forEach(sec => {
            html += `<div class="summary-container"><div class="summary-header">${sec.title}</div>`;
            for (let i = sec.range[0]; i <= sec.range[1]; i++) {
                const qId = "q" + i;
                const label = questionLabels[qId];
                if (label) {
                    html += `<div class="summary-row"><span>${label}:</span><span>${getVal(qId)}</span></div>`;
                }
            }
            html += `</div>`;
        });
        
        document.getElementById('summarySections').innerHTML = html;
    },

    finalSubmit: function() {
        this.hideModal('submitModal');
        const randomDigits = Math.floor(Math.random() * 9000000000 + 1000000000);
        const seID = `H${randomDigits}`;
        document.getElementById('finalSEID').innerText = seID;

        const answers = {};
        for (let i = 1; i <= 34; i++) {
            const qId = 'q' + i;
            const input = document.getElementById(qId);
            if (input) {
                answers[qId] = input.value || "";
            } else {
                const radios = document.getElementsByName(qId);
                if (radios.length > 0) {
                    let val = "";
                    for (let r of radios) { if (r.checked) val = r.parentElement.innerText.trim(); }
                    answers[qId] = val;
                }
            }
        }

        const submissionData = {
            id: seID,
            line: "SE", // Mark as Self-Enumeration
            date: new Date().toLocaleDateString('en-GB'),
            status: "Submitted",
            headName: this.state.headName,
            mobile: this.state.mobile,
            email: this.state.email,
            sheetName: "Sheet2", // Target Sheet2 specifically
            answers: answers,
            sendEmail: true,
            emailSubject: "Confirmation: Census 2027 Self-Enumeration",
            emailBody: `Dear Respondent,\nThank you for completing self-enumeration.\nYour SE ID is\n${seID}.\nPlease keep this safe and share it with\nEnumerator when asked.\n- Census2027`
        };

        // 2. Save to LocalStorage
        localStorage.setItem(`census_se_${this.state.mobile}`, JSON.stringify(submissionData));

        // 4. Send to Google Sheets
        const scriptURL = 'https://script.google.com/macros/s/AKfycbx4KkUWwkSSNFXLmQ8bUIYvLiiXnC4aOLkNWD2aXjdbrbS86er9oC4BICzfjWvoZPPb/exec';
        
        fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
        }).then(() => {
            console.log("Data sent to Google Sheets via POST");
        }).catch(err => {
            console.error("Error sending to Google Sheets:", err);
        });
        
        // Hide stepper on success
        document.getElementById('stepperContainer').style.display = 'none';
        this.goToScreen('screen-success');
    }
};

// Auto format current date
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const formattedDate = String(today.getDate()).padStart(2, '0') + '.' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '.' + 
                          today.getFullYear();
    if(document.getElementById('currentDate')) document.getElementById('currentDate').innerText = formattedDate;
});
