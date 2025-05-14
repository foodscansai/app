        // DOM elements
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');
        const imagePreview = document.getElementById('imagePreview');
        const uploadPreview = document.getElementById('uploadPreview');
        const uploadDefaultContent = document.querySelector('.upload-default-content');
        const closePreview = document.getElementById('closePreview');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const btnLoader = document.getElementById('btnLoader');
        const actionButtons = document.getElementById('actionButtons');
        const loader = document.getElementById('loader');
        const errorMessage = document.getElementById('errorMessage');
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsList = document.getElementById('resultsList');
        const uploadContainer = document.getElementById('uploadContainer');
        const checkAnotherBtn = document.getElementById('checkAnotherBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        // API Key - Note: Typically you would handle this on the server side for security
        const GEMINI_API_KEY = 'AIzaSyAAbM_emAaAMqEGTdGM785h7HPYh7XZvGU';
        
        // Event listeners
        browseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Create a single file input click event
            setTimeout(() => {
                fileInput.click();
            }, 50);
        });
        
        uploadArea.addEventListener('click', (e) => {
            // Prevent multiple clicks
            if (e.target !== browseBtn && !browseBtn.contains(e.target) && 
                e.target !== closePreview && !closePreview.contains(e.target) &&
                !uploadPreview.classList.contains('show')) {
                e.preventDefault();
                e.stopPropagation();
                setTimeout(() => {
                    fileInput.click();
                }, 50);
            }
        });
        
        closePreview.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetPreview();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('active');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('active');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('active');
            
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFile(fileInput.files[0]);
            }
        });
        
        analyzeBtn.addEventListener('click', analyzeImage);
        
        checkAnotherBtn.addEventListener('click', () => {
            resultsContainer.classList.remove('show');
            uploadContainer.style.display = 'block';
            resetAnalyzer();
        });
        
        downloadBtn.addEventListener('click', generatePDF);

        // Function to handle the selected file
        function handleFile(file) {
            if (!file.type.startsWith('image/')) {
                showError('Please select a valid image file (JPEG, PNG, etc.).');
                return;
            }
            
            // Display image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                showPreview();
                resultsContainer.classList.remove('show');
                hideError();
                
                // Show analyze button
                actionButtons.style.display = 'flex';
                
                // Create a new DataTransfer object and assign the file
                try {
                    // For modern browsers that support DataTransfer
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                } catch (err) {
                    // This is handled by our analyzeImage function as a fallback
                    console.log('DataTransfer not supported, using fetch fallback in analyzeImage');
                }
            };
            reader.readAsDataURL(file);
        }
        
        // Function to show the preview
        function showPreview() {
            uploadPreview.classList.add('show');
            uploadDefaultContent.style.opacity = '0';
            uploadDefaultContent.style.display = 'none';
        }
        
        // Function to reset just the preview
        function resetPreview() {
            uploadPreview.classList.remove('show');
            uploadDefaultContent.style.opacity = '1';
            uploadDefaultContent.style.display = 'flex';
            imagePreview.src = '';
            fileInput.value = '';
            actionButtons.style.display = 'none';
        }

        // Function to reset the analyzer
        function resetAnalyzer() {
            fileInput.value = '';
            imagePreview.src = '';
            resetPreview();
            resultsContainer.classList.remove('show');
            uploadContainer.style.display = 'block';
            hideError();
        }

        // Function to analyze the image using Gemini Flash 2.0
        async function analyzeImage() {
            showLoader();
            hideError();
            
            try {
                // Get the image file
                let file = fileInput.files[0];
                
                if (!file) {
                    // If no file is selected but preview is shown, the drag and drop image hasn't been assigned to fileInput
                    if (imagePreview.src && imagePreview.src !== '') {
                        // Convert the image preview back to a file
                        const response = await fetch(imagePreview.src);
                        const blob = await response.blob();
                        file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                    } else {
                        throw new Error('No image selected');
                    }
                }
                
                // Convert the image to base64
                const base64Image = await fileToBase64(file);
                
                // Prepare the request to Gemini API
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                {
                                    text: `Analyze this food image and provide detailed calorie and nutritional information. 
                                    Also suggest a basic recipe for making this dish.
                                    Return ONLY a valid JSON object with the following structure:
                                    {
                                        "foodName": "Name of the food",
                                        "description": "Brief description of the food",
                                        "servingSize": "Estimated serving size",
                                        "calories": "Total calories (number)",
                                        "protein": "Protein in grams (number)",
                                        "carbs": "Carbohydrates in grams (number)",
                                        "fat": "Fat in grams (number)",
                                        "fiber": "Dietary fiber in grams (number)",
                                        "sugar": "Sugar in grams (number)",
                                        "healthTags": ["tag1", "tag2"],
                                        "recipe": "A recipe for making this dish with above calories and nutrients",
                                        "additionalInfo": "Any additional nutritional insights"
                                    }`
                                },
                                {
                                    inline_data: {
                                        mime_type: file.type,
                                        data: base64Image.split(',')[1]
                                    }
                                }
                            ]
                        }]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
                }

                const data = await response.json();
                
                // Extract and process the response text
                const responseText = data.candidates[0]?.content?.parts[0]?.text;
                if (!responseText) {
                    throw new Error('No response from the API');
                }

                // Try to extract JSON from the response
                let foodData;
                try {
                    // First try to parse the entire response as JSON
                    foodData = JSON.parse(responseText);
                } catch (e) {
                    // If that fails, try to find and extract a JSON object from the text
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            foodData = JSON.parse(jsonMatch[0]);
                        } catch (e2) {
                            // If JSON extraction fails, process as text
                            foodData = standardizeFoodData(responseText);
                        }
                    } else {
                        // Process as text
                        foodData = standardizeFoodData(responseText);
                    }
                }

                // Hide upload container and show results
                uploadContainer.style.display = 'none';
                displayResults(standardizeFoodData(foodData));
            } catch (error) {
                console.error('Error:', error);
                showError(error.message || 'An error occurred while analyzing the image. Please try again with a clearer image.');
            } finally {
                hideLoader();
            }
        }
        
        // Generate PDF for download
        async function generatePDF() {
            // Show loading state on download button
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span>Generating PDF...</span>';
            
            try {
                // We'll use html2pdf.js to generate the PDF
                // Dynamically load the library if needed
                if (typeof html2pdf === 'undefined') {
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
                }
                
                // Create a simplified version of the results for PDF
                const element = document.createElement('div');
                element.style.padding = '15px';
                element.style.fontFamily = 'Arial, sans-serif';
                element.style.fontSize = '12px';
                element.style.maxWidth = '100%';
                
                // Add a title
                const titleDiv = document.createElement('div');
                titleDiv.innerHTML = `
                    <h1 style="text-align: center; color: white; margin-bottom: 10px; background-color: #0077FF; padding: 10px; border-radius: 8px; font-size: 18px;">Food Calorie Analysis Report</h1>
                    <p style="text-align: center; margin-bottom: 15px; font-size: 12px;">Generated on ${new Date().toLocaleDateString()}</p>
                `;
                element.appendChild(titleDiv);
                
                // Extract food image and info
                const foodName = resultsList.querySelector('.food-name')?.textContent || 'Food Analysis';
                const foodDesc = resultsList.querySelector('.food-description')?.textContent || '';
                const imageUrl = resultsList.querySelector('.food-result-image')?.src || '';
                
                // Header with image and basic info
                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.marginBottom = '15px';
                header.style.gap = '15px';
                header.innerHTML = `
                    <div style="width: 80px; height: 80px; overflow: hidden; border-radius: 6px; flex-shrink: 0;">
                        <img src="${imageUrl}" alt="${foodName}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div>
                        <h2 style="margin: 0 0 5px 0; font-size: 16px; color: #0077FF;">${foodName}</h2>
                        <p style="margin: 0; font-size: 11px; color: #4b5563;">${foodDesc}</p>
                    </div>
                `;
                element.appendChild(header);
                
                // Macro info
                const macroSection = document.createElement('div');
                macroSection.style.display = 'grid';
                macroSection.style.gridTemplateColumns = 'repeat(4, 1fr)';
                macroSection.style.gap = '8px';
                macroSection.style.marginBottom = '15px';
                macroSection.style.backgroundColor = '#f5f9ff';
                macroSection.style.padding = '10px';
                macroSection.style.borderRadius = '6px';
                
                // Get macro values
                const macroItems = resultsList.querySelectorAll('.macro-item');
                macroItems.forEach(item => {
                    const value = item.querySelector('.macro-value').textContent;
                    const label = item.querySelector('.macro-label').textContent;
                    
                    macroSection.innerHTML += `
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #0077FF; font-size: 14px;">${value}</div>
                            <div style="color: #4b5563; font-size: 11px;">${label}</div>
                        </div>
                    `;
                });
                element.appendChild(macroSection);
                
                // Nutrition table - more compact
                const tableSection = document.createElement('div');
                tableSection.style.marginBottom = '15px';
                
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.fontSize = '11px';
                
                // Add table header
                table.innerHTML = `
                    <thead>
                        <tr style="background-color: #0077FF; color: white;">
                            <th style="padding: 6px; text-align: left;">Nutrient</th>
                            <th style="padding: 6px; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                `;
                
                // Get nutrition values
                const tableRows = resultsList.querySelectorAll('.nutrition-table tbody tr');
                tableRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 2) {
                        table.innerHTML += `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 4px 6px;">${cells[0].textContent}</td>
                                <td style="padding: 4px 6px; text-align: right;">${cells[1].textContent}</td>
                            </tr>
                        `;
                    }
                });
                
                table.innerHTML += '</tbody>';
                tableSection.appendChild(table);
                element.appendChild(tableSection);
                
                // Recipe section if available
                const recipeText = resultsList.querySelector('.recipe-text')?.textContent;
                if (recipeText) {
                    const recipeSection = document.createElement('div');
                    recipeSection.style.backgroundColor = '#e6f0ff';
                    recipeSection.style.padding = '10px';
                    recipeSection.style.borderRadius = '6px';
                    recipeSection.style.borderLeft = '3px solid #0077FF';
                    recipeSection.style.marginBottom = '15px';
                    
                    recipeSection.innerHTML = `
                        <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #0077FF;">Recipe Suggestion</h3>
                        <p style="margin: 0; font-size: 11px; line-height: 1.4;">${recipeText}</p>
                    `;
                    element.appendChild(recipeSection);
                }
                
                // Health tags if available
                const healthTags = resultsList.querySelectorAll('.health-tag');
                if (healthTags.length > 0) {
                    const tagsSection = document.createElement('div');
                    tagsSection.style.marginBottom = '15px';
                    
                    let tagsHtml = '<div style="margin-bottom: 5px; font-weight: bold; font-size: 12px;">Health Tags:</div><div style="display: flex; flex-wrap: wrap; gap: 5px;">';
                    
                    healthTags.forEach(tag => {
                        tagsHtml += `<span style="background-color: #e6f0ff; color: #0077FF; padding: 3px 8px; border-radius: 12px; font-size: 10px;">${tag.textContent}</span>`;
                    });
                    
                    tagsHtml += '</div>';
                    tagsSection.innerHTML = tagsHtml;
                    element.appendChild(tagsSection);
                }
                
                // Additional info section if available
                const additionalInfoText = resultsList.querySelector('.additional-info')?.textContent;
                if (additionalInfoText) {
                    const additionalSection = document.createElement('div');
                    additionalSection.style.marginBottom = '15px';
                    additionalSection.style.fontSize = '11px';
                    additionalSection.style.color = '#4b5563';
                    additionalSection.style.borderTop = '1px solid #e5e7eb';
                    additionalSection.style.paddingTop = '10px';
                    additionalSection.innerHTML = additionalInfoText;
                    element.appendChild(additionalSection);
                }
                
                // Footer
                const footer = document.createElement('div');
                footer.style.textAlign = 'center';
                footer.style.fontSize = '10px';
                footer.style.color = '#4b5563';
                footer.style.marginTop = '15px';
                footer.innerHTML = 'Generated by FoodScan AI | www.foodcalorieanalyzer.com';
                element.appendChild(footer);
                
                // Setup options for PDF
                const opt = {
                    margin: [10, 10],
                    filename: 'food-analysis-report.pdf',
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all'] }
                };
                
                // Generate and download PDF
                await html2pdf().set(opt).from(element).save();
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Could not generate PDF. Please try again later.');
            } finally {
                // Restore button state
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<span><i class="btn-icon">📥</i> Download PDF</span>';
            }
        }
        
        // Helper function to dynamically load scripts
        function loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // Standardize food data to ensure consistent structure
        function standardizeFoodData(data) {
            // If data is a string, try to extract basic info
            if (typeof data === 'string') {
                // Basic extraction from text
                const foodNameMatch = data.match(/food(?:\s+name)?[:\s]+([^\n.,]+)/i);
                const caloriesMatch = data.match(/calories?[:\s]+(\d+)(?:\s*-\s*(\d+))?/i);
                const servingSizeMatch = data.match(/serving(?:\s+size)?[:\s]+([^\n.,]+)/i);
                const proteinMatch = data.match(/protein[:\s]+(\d+(?:\.\d+)?)(?:\s*g)/i);
                const carbsMatch = data.match(/carb(?:ohydrate)?s?[:\s]+(\d+(?:\.\d+)?)(?:\s*g)/i);
                const fatMatch = data.match(/fat[:\s]+(\d+(?:\.\d+)?)(?:\s*g)/i);
                
                return {
                    foodName: foodNameMatch ? foodNameMatch[1].trim() : 'Unknown Food',
                    description: 'A delicious and nutritious food item.',
                    servingSize: servingSizeMatch ? servingSizeMatch[1].trim() : 'Standard serving',
                    calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 'N/A',
                    protein: proteinMatch ? parseFloat(proteinMatch[1]) : 'N/A',
                    carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 'N/A',
                    fat: fatMatch ? parseFloat(fatMatch[1]) : 'N/A',
                    fiber: 'N/A',
                    sugar: 'N/A',
                    healthTags: ['Nutritional data'],
                    recipe: 'No recipe information available.',
                    additionalInfo: 'Limited nutritional information available for this food item.'
                };
            }
            
            // Ensure all expected fields exist
            return {
                foodName: data.foodName || 'Unknown Food',
                description: data.description || 'A delicious and nutritious food item.',
                servingSize: data.servingSize || 'Standard serving',
                calories: data.calories || 'N/A',
                protein: data.protein || 'N/A',
                carbs: data.carbs || 'N/A',
                fat: data.fat || 'N/A',
                fiber: data.fiber || 'N/A',
                sugar: data.sugar || 'N/A',
                healthTags: Array.isArray(data.healthTags) ? data.healthTags : ['Nutritional data'],
                recipe: data.recipe || 'No recipe information available.',
                additionalInfo: data.additionalInfo || 'Full nutritional analysis available.'
            };
        }

        // Helper function to convert file to base64
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        }

        // Function to display the analysis results in a professional table format
        function displayResults(data) {
            resultsList.innerHTML = '';
            
            // Food name and description with image
            const foodHeader = document.createElement('div');
            foodHeader.className = 'food-header';
            foodHeader.innerHTML = `
                <div class="food-image-container">
                    <img src="${imagePreview.src}" alt="${data.foodName}" class="food-result-image">
                </div>
                <div class="food-info">
                    <h3 class="food-name">${data.foodName}</h3>
                    <p class="food-description">${data.description}</p>
                </div>
            `;
            resultsList.appendChild(foodHeader);
            
            // Macro breakdown chart
            const macroChart = document.createElement('div');
            macroChart.className = 'macro-chart';
            macroChart.innerHTML = `
                <div class="macro-item">
                    <div class="macro-value">${data.calories}</div>
                    <div class="macro-label">Calories</div>
                </div>
                <div class="macro-item">
                    <div class="macro-value">${data.protein}g</div>
                    <div class="macro-label">Protein</div>
                </div>
                <div class="macro-item">
                    <div class="macro-value">${data.carbs}g</div>
                    <div class="macro-label">Carbs</div>
                </div>
                <div class="macro-item">
                    <div class="macro-value">${data.fat}g</div>
                    <div class="macro-label">Fat</div>
                </div>
            `;
            resultsList.appendChild(macroChart);
            
            // Nutrition table
            const nutritionTable = document.createElement('table');
            nutritionTable.className = 'nutrition-table';
            nutritionTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Nutrient</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Serving Size</td>
                        <td>${data.servingSize}</td>
                    </tr>
                    <tr>
                        <td>Calories</td>
                        <td>${data.calories}</td>
                    </tr>
                    <tr>
                        <td>Protein</td>
                        <td>${data.protein}g</td>
                    </tr>
                    <tr>
                        <td>Carbohydrates</td>
                        <td>${data.carbs}g</td>
                    </tr>
                    <tr>
                        <td>Fat</td>
                        <td>${data.fat}g</td>
                    </tr>
                    <tr>
                        <td>Fiber</td>
                        <td>${data.fiber}g</td>
                    </tr>
                    <tr>
                        <td>Sugar</td>
                        <td>${data.sugar}g</td>
                    </tr>
                </tbody>
            `;
            resultsList.appendChild(nutritionTable);
            
            // Health tags
            if (data.healthTags && data.healthTags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'health-tags';
                
                let tagsHTML = '';
                data.healthTags.forEach(tag => {
                    tagsHTML += `<span class="health-tag">${tag}</span>`;
                });
                
                tagsContainer.innerHTML = tagsHTML;
                resultsList.appendChild(tagsContainer);
            }
            
            // Recipe section (new)
            if (data.recipe) {
                const recipeSection = document.createElement('div');
                recipeSection.className = 'recipe-section';
                recipeSection.innerHTML = `
                    <h3 class="recipe-title">Recipe Suggestion</h3>
                    <p class="recipe-text">${data.recipe}</p>
                `;
                resultsList.appendChild(recipeSection);
            }
            
            // Additional info
            if (data.additionalInfo) {
                const additionalInfo = document.createElement('p');
                additionalInfo.className = 'additional-info';
                additionalInfo.style.marginTop = '1.5rem';
                additionalInfo.style.paddingTop = '1rem';
                additionalInfo.style.borderTop = '1px solid var(--gray-200)';
                additionalInfo.innerHTML = `<strong>Additional Information:</strong> ${data.additionalInfo}`;
                resultsList.appendChild(additionalInfo);
            }
            
            resultsContainer.classList.add('show');
            
            // Scroll to results if on mobile
            if (window.innerWidth < 768) {
                resultsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Utility functions
        function showLoader() {
            // Show loader inside button
            btnLoader.classList.add('show');
            analyzeBtn.disabled = true;
        }
        
        function hideLoader() {
            btnLoader.classList.remove('show');
            analyzeBtn.disabled = false;
        }
        
        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
        
        function hideError() {
            errorMessage.style.display = 'none';
        }
        
        // Initialize the UI
        function initUI() {
            // Hide the action buttons initially
            actionButtons.style.display = 'none';
        }
        
        // Call init function
        initUI();
        
        // Add structured data for SEO
        function addStructuredData() {
            const structuredData = {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "FoodScans App",
                "url": "https://foodscans.app",
                "description": "Analyze food images to get accurate calorie and nutritional information using AI technology.",
                "applicationCategory": "HealthApplication",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                },
                "operatingSystem": "All",
                "browserRequirements": "Requires JavaScript"
            };
            
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify(structuredData);
            document.head.appendChild(script);
        }
        
        // Call the function to add structured data
        addStructuredData();