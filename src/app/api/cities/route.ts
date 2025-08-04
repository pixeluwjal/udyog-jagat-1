// src/app/api/cities/route.ts
import { NextResponse } from 'next/server';

// This is a hardcoded list to simulate a real API.
// In a production environment, you would fetch this data from a database or a third-party service.
const indianCities = [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat",
    "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
    "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
    "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar",
    "Aurangabad", "Dhanbad", "Amritsar", "Allahabad", "Ranchi", "Coimbatore", "Jabalpur",
    "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati",
    "Chandigarh", "Mysore", "Bhubaneswar", "Tiruchirappalli", "Dehradun", "Thiruvananthapuram",
    "Bhiwandi", "Warangal", "Solapur", "Bareilly", "Moradabad", "Tiruppur", "Gurgaon",
    "Aligarh", "Jalandhar", "Kochi", "Salem", "Gorakhpur", "Bikaner", "Puducherry",
    "Noida", "Udaipur", "Amravati", "Erode", "Ajmer", "Bhavnagar", "Jamnagar",
    "Belgaum", "Hubli-Dharwad", "Mangalore", "Cuttack", "Kolhapur", "Asansol", "Guntur",
    "Nellore", "Rourkela", "Durgapur", "Rourkela", "Kakinada", "Kurnool", "Akola", "Kozhikode",
    "Siliguri", "Karimnagar", "Jammu", "Bhagalpur", "Bhilai", "Bhiwani", "Cuddalore",
    "Dehri", "Dibrugarh", "Ernakulam", "Gaya", "Gulbarga", "Hisar", "Imphal", "Jalgaon",
    "Jhansi", "Junagadh", "Karnal", "Kollam", "Korba", "Kottayam", "Kakinada", "Kumbakonam",
    "Latur", "Mangalore", "Mira-Bhayandar", "Muzaffarpur", "Nanded", "Panipat", "Parbhani",
    "Puducherry", "Purnia", "Rohtak", "Sambalpur", "Satara", "Shahjahanpur", "Shimla",
    "Singrauli", "Sirsa", "Sonipat", "Sultanpur", "Thoothukudi", "Tirunelveli", "Tumkur",
    "Udupi", "Ujjain", "Vasai-Virar", "Vellore", "Yamunanagar"
];

export async function GET() {
    return NextResponse.json({ cities: indianCities });
}
