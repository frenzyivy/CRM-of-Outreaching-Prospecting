"""
One-time script to generate sample master_leads.xlsx with medical industry data.
Run: python -m tools.create_sample_data
"""

import os
import pandas as pd

companies = [
    {"Company Name": "MedTech Solutions", "Industry": "Medical Devices", "Size": "50-200", "Location": "San Francisco, CA", "Website": "medtechsolutions.com", "Phone": "+1-415-555-0101", "Notes": "FDA-approved devices"},
    {"Company Name": "HealthFirst Diagnostics", "Industry": "Diagnostics", "Size": "200-500", "Location": "Boston, MA", "Website": "healthfirstdx.com", "Phone": "+1-617-555-0102", "Notes": "Rapid testing kits"},
    {"Company Name": "CareBridge Hospital Group", "Industry": "Hospital Network", "Size": "1000+", "Location": "Chicago, IL", "Website": "carebridge.org", "Phone": "+1-312-555-0103", "Notes": "12 hospitals in midwest"},
    {"Company Name": "PharmaCore Labs", "Industry": "Pharmaceuticals", "Size": "500-1000", "Location": "New Jersey, NJ", "Website": "pharmacore.com", "Phone": "+1-201-555-0104", "Notes": "Generic drug manufacturer"},
    {"Company Name": "VitalSign AI", "Industry": "Health Tech", "Size": "10-50", "Location": "Austin, TX", "Website": "vitalsignai.com", "Phone": "+1-512-555-0105", "Notes": "AI patient monitoring startup"},
    {"Company Name": "OrthoPro Implants", "Industry": "Medical Devices", "Size": "200-500", "Location": "Minneapolis, MN", "Website": "orthopro.com", "Phone": "+1-612-555-0106", "Notes": "Joint replacement implants"},
    {"Company Name": "NeuroCare Clinics", "Industry": "Specialty Clinics", "Size": "50-200", "Location": "Los Angeles, CA", "Website": "neurocare.com", "Phone": "+1-310-555-0107", "Notes": "Neurology clinic chain"},
    {"Company Name": "BioGenesis Research", "Industry": "Biotech", "Size": "100-500", "Location": "San Diego, CA", "Website": "biogenesis.com", "Phone": "+1-858-555-0108", "Notes": "Gene therapy R&D"},
    {"Company Name": "MediSupply Direct", "Industry": "Medical Supplies", "Size": "50-200", "Location": "Dallas, TX", "Website": "medisupply.com", "Phone": "+1-214-555-0109", "Notes": "B2B medical supply distributor"},
    {"Company Name": "TeleMed Connect", "Industry": "Telehealth", "Size": "50-200", "Location": "Seattle, WA", "Website": "telemedconnect.com", "Phone": "+1-206-555-0110", "Notes": "Telehealth platform provider"},
    {"Company Name": "Precision Oncology Inc", "Industry": "Oncology", "Size": "200-500", "Location": "Houston, TX", "Website": "precisiononcology.com", "Phone": "+1-713-555-0111", "Notes": "Personalized cancer treatment"},
    {"Company Name": "CloudHealth Systems", "Industry": "Health IT", "Size": "100-500", "Location": "Atlanta, GA", "Website": "cloudhealthsys.com", "Phone": "+1-404-555-0112", "Notes": "EHR/EMR solutions"},
    {"Company Name": "SurgiTech Robotics", "Industry": "Surgical Tech", "Size": "50-200", "Location": "Pittsburgh, PA", "Website": "surgitech.com", "Phone": "+1-412-555-0113", "Notes": "Robotic surgery systems"},
    {"Company Name": "Apex Dental Group", "Industry": "Dental", "Size": "200-500", "Location": "Phoenix, AZ", "Website": "apexdental.com", "Phone": "+1-602-555-0114", "Notes": "Dental clinic chain, 30+ locations"},
    {"Company Name": "RehabWorks Therapy", "Industry": "Rehabilitation", "Size": "100-500", "Location": "Denver, CO", "Website": "rehabworks.com", "Phone": "+1-303-555-0115", "Notes": "Physical therapy centers"},
]

contacts = [
    {"First Name": "Sarah", "Last Name": "Mitchell", "Title": "VP of Operations", "Email": "sarah.mitchell@medtechsolutions.com", "Phone": "+1-415-555-1001", "Company": "MedTech Solutions", "LinkedIn": "linkedin.com/in/sarahmitchell", "Notes": "Decision maker for procurement"},
    {"First Name": "James", "Last Name": "Chen", "Title": "Chief Medical Officer", "Email": "james.chen@healthfirstdx.com", "Phone": "+1-617-555-1002", "Company": "HealthFirst Diagnostics", "LinkedIn": "linkedin.com/in/jameschen", "Notes": "Met at HIMSS conference"},
    {"First Name": "Emily", "Last Name": "Rodriguez", "Title": "Director of IT", "Email": "emily.rodriguez@carebridge.org", "Phone": "+1-312-555-1003", "Company": "CareBridge Hospital Group", "LinkedIn": "linkedin.com/in/emilyrodriguez", "Notes": "Looking for new EHR system"},
    {"First Name": "Michael", "Last Name": "Thompson", "Title": "Head of Procurement", "Email": "m.thompson@pharmacore.com", "Phone": "+1-201-555-1004", "Company": "PharmaCore Labs", "LinkedIn": "linkedin.com/in/mthompson", "Notes": "Budget approved for Q2"},
    {"First Name": "Priya", "Last Name": "Sharma", "Title": "CEO", "Email": "priya@vitalsignai.com", "Phone": "+1-512-555-1005", "Company": "VitalSign AI", "LinkedIn": "linkedin.com/in/priyasharma", "Notes": "Series A funded, expanding team"},
    {"First Name": "David", "Last Name": "Kowalski", "Title": "Sales Director", "Email": "david.k@orthopro.com", "Phone": "+1-612-555-1006", "Company": "OrthoPro Implants", "LinkedIn": "linkedin.com/in/davidkowalski", "Notes": "Interested in partnership"},
    {"First Name": "Lisa", "Last Name": "Park", "Title": "Clinical Director", "Email": "lisa.park@neurocare.com", "Phone": "+1-310-555-1007", "Company": "NeuroCare Clinics", "LinkedIn": "linkedin.com/in/lisapark", "Notes": "Expanding to 5 new locations"},
    {"First Name": "Robert", "Last Name": "Nguyen", "Title": "Research Director", "Email": "r.nguyen@biogenesis.com", "Phone": "+1-858-555-1008", "Company": "BioGenesis Research", "LinkedIn": "linkedin.com/in/robertnguyen", "Notes": "Looking for lab equipment vendors"},
    {"First Name": "Amanda", "Last Name": "Foster", "Title": "Operations Manager", "Email": "amanda.foster@medisupply.com", "Phone": "+1-214-555-1009", "Company": "MediSupply Direct", "LinkedIn": "linkedin.com/in/amandafoster", "Notes": "Manages vendor relationships"},
    {"First Name": "Kevin", "Last Name": "O'Brien", "Title": "CTO", "Email": "kevin@telemedconnect.com", "Phone": "+1-206-555-1010", "Company": "TeleMed Connect", "LinkedIn": "linkedin.com/in/kevinobrien", "Notes": "Building HIPAA-compliant platform"},
    {"First Name": "Jennifer", "Last Name": "Walsh", "Title": "VP of Business Dev", "Email": "j.walsh@precisiononcology.com", "Phone": "+1-713-555-1011", "Company": "Precision Oncology Inc", "LinkedIn": "linkedin.com/in/jenniferwalshl", "Notes": "Open to strategic partnerships"},
    {"First Name": "Thomas", "Last Name": "Baker", "Title": "Product Manager", "Email": "thomas.baker@cloudhealthsys.com", "Phone": "+1-404-555-1012", "Company": "CloudHealth Systems", "LinkedIn": "linkedin.com/in/thomasbaker", "Notes": "Launching new module Q3"},
    {"First Name": "Maria", "Last Name": "Santos", "Title": "Head of Surgery", "Email": "maria.santos@surgitech.com", "Phone": "+1-412-555-1013", "Company": "SurgiTech Robotics", "LinkedIn": "linkedin.com/in/mariasantos", "Notes": "Evaluating robotic systems"},
    {"First Name": "Brian", "Last Name": "Cooper", "Title": "CEO", "Email": "brian.cooper@apexdental.com", "Phone": "+1-602-555-1014", "Company": "Apex Dental Group", "LinkedIn": "linkedin.com/in/briancooper", "Notes": "Expanding rapidly, needs supply chain help"},
    {"First Name": "Rachel", "Last Name": "Kim", "Title": "Director of Therapy", "Email": "rachel.kim@rehabworks.com", "Phone": "+1-303-555-1015", "Company": "RehabWorks Therapy", "LinkedIn": "linkedin.com/in/rachelkim", "Notes": "Looking for patient management software"},
    {"First Name": "Alex", "Last Name": "Rivera", "Title": "Marketing Director", "Email": "alex.rivera@medtechsolutions.com", "Phone": "+1-415-555-1016", "Company": "MedTech Solutions", "LinkedIn": "linkedin.com/in/alexrivera", "Notes": "Handles conference sponsorships"},
    {"First Name": "Nicole", "Last Name": "Adams", "Title": "Chief Nursing Officer", "Email": "nicole.adams@carebridge.org", "Phone": "+1-312-555-1017", "Company": "CareBridge Hospital Group", "LinkedIn": "linkedin.com/in/nicoleadams", "Notes": "Leads nursing staff of 800+"},
    {"First Name": "Daniel", "Last Name": "Lee", "Title": "VP of Engineering", "Email": "daniel.lee@vitalsignai.com", "Phone": "+1-512-555-1018", "Company": "VitalSign AI", "LinkedIn": "linkedin.com/in/daniellee", "Notes": "Building ML pipeline team"},
    {"First Name": "Stephanie", "Last Name": "Hernandez", "Title": "Compliance Officer", "Email": "s.hernandez@pharmacore.com", "Phone": "+1-201-555-1019", "Company": "PharmaCore Labs", "LinkedIn": "linkedin.com/in/stephaniehernandez", "Notes": "FDA compliance specialist"},
    {"First Name": "Mark", "Last Name": "Wilson", "Title": "Facility Manager", "Email": "mark.wilson@apexdental.com", "Phone": "+1-602-555-1020", "Company": "Apex Dental Group", "LinkedIn": "linkedin.com/in/markwilson", "Notes": "Manages equipment purchasing"},
    {"First Name": "Laura", "Last Name": "Green", "Title": "Head of R&D", "Email": "laura.green@healthfirstdx.com", "Phone": "+1-617-555-1021", "Company": "HealthFirst Diagnostics", "LinkedIn": "linkedin.com/in/lauragreen", "Notes": "Developing next-gen PCR tests"},
    {"First Name": "Chris", "Last Name": "Morgan", "Title": "Supply Chain Director", "Email": "chris.morgan@medisupply.com", "Phone": "+1-214-555-1022", "Company": "MediSupply Direct", "LinkedIn": "linkedin.com/in/chrismorgan", "Notes": "Optimizing logistics network"},
    {"First Name": "Patricia", "Last Name": "Davis", "Title": "Practice Manager", "Email": "p.davis@neurocare.com", "Phone": "+1-310-555-1023", "Company": "NeuroCare Clinics", "LinkedIn": "linkedin.com/in/patriciadavis", "Notes": "Handles vendor selection"},
    {"First Name": "Andrew", "Last Name": "Taylor", "Title": "CFO", "Email": "andrew.taylor@surgitech.com", "Phone": "+1-412-555-1024", "Company": "SurgiTech Robotics", "LinkedIn": "linkedin.com/in/andrewtaylor", "Notes": "Controls capital expenditure approvals"},
    {"First Name": "Jessica", "Last Name": "Brown", "Title": "Telehealth Coordinator", "Email": "jessica.brown@telemedconnect.com", "Phone": "+1-206-555-1025", "Company": "TeleMed Connect", "LinkedIn": "linkedin.com/in/jessicabrown", "Notes": "Manages provider onboarding"},
]

def create_sample_excel():
    os.makedirs("data", exist_ok=True)
    output_path = "data/master_leads.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(companies).to_excel(writer, sheet_name="Companies", index=False)
        pd.DataFrame(contacts).to_excel(writer, sheet_name="Contacts", index=False)

    print(f"Created {output_path} with {len(companies)} companies and {len(contacts)} contacts")

if __name__ == "__main__":
    create_sample_excel()
