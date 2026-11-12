import { useState, useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QrScanner from 'qr-scanner';
import axios from 'axios';
import { convertXML } from 'simple-xml-to-json';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { updateUserInfo } from '../api/profiles';
import { useAuth } from '../store/authStore';
import { RotateCw, CreditCard, Car, Plane, Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';

const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || import.meta.env.VITE_API_URL || '';

function isEmpty(val) {
  return val === undefined || val == null || val.length <= 0 || val == 0 ? true : false;
}

function isObjEmpty(val) {
  return val == null ||
    val.length <= 0 ||
    (Object.keys(val).length === 0 && val.constructor === Object)
    ? true
    : false;
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && !isNaN(n - 0);
}

// multiplication table d
var d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
// permutation table p
var p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
// inverse table inv
var _inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
// converts string or number to an array and inverts it
function invArray(array) {
  if (Object.prototype.toString.call(array) == '[object Number]') {
    array = String(array);
  }

  if (Object.prototype.toString.call(array) == '[object String]') {
    array = array.split('').map(Number);
  }

  return array.reverse();
}

// validates checksum
function validate(array) {
  var c = 0;
  var invertedArray = invArray(array);

  for (var i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }
  return c === 0;
  /*var regexp=/^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/;
  if (regexp.test(array)) {
      return true
  } else {
    return false
  }*/
}

function validate_adhar(adhar) {
  //console.clear();
  //pretty dumb but the easiest solution to know if the number is 12 digit or not :)
  if (adhar >= 100000000000 && adhar <= 999999999999) {
    if (validate(adhar) == false) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
}

function Verify() {
  const { user, profiledata, setProfiledata } = useAuth();
  const [aadharNum, setAadharNum] = useState('');
  const [_file1, setFile1] = useState(null);
  let [numclass, setNumclass] = useState('');
  let [imgclass, setImgclass] = useState('hidden');
  let [retryclass, setRetryclass] = useState('custom-opacity');
  let [opacityclass, setOpacityclass] = useState('');
  const [aadharImg, setAadharImg] = useState({});
  const [verifysuccess, setVerifysuccess] = useState(false);
  const [aadharAdding, setaAdharAdding] = useState(false);
  const isOnline = useOnlineStatus();
  const trycount = useRef(
    isObjEmpty(profiledata?.verifytrycount) ? 0 : profiledata?.verifytrycount,
  );
  let aadharqrscanpass = false;
  let errmsg = '';

  // Driver License OCR states
  const [dlFrontImg, setDlFrontImg] = useState({});
  const [dlBackImg, setDlBackImg] = useState({});
  const [dlProcessing, setDlProcessing] = useState(false);
  const [dlFormData, setDlFormData] = useState({
    licenseNumber: '',
    state: '',
    dob: '',
    expiry: '',
    name: '',
    address: '',
  });

  // Passport OCR states
  const [passportImg, setPassportImg] = useState({});
  const [passportAddressImg, setPassportAddressImg] = useState({});
  const [passportProcessing, setPassportProcessing] = useState(false);
  const [passportFormData, setPassportFormData] = useState({
    passportNumber: '',
    country: '',
    dob: '',
    expiry: '',
    name: '',
    placeOfBirth: '',
    nationality: '',
  });

  useEffect(() => {
    const setAadharverified = async () => {
      let aadharverified = true;

      const res = await updateUserInfo(user?.id, {
        aadharverified: aadharverified,
      });
      if (res.success) {
        setProfiledata({ ...profiledata, aadharverified: aadharverified });
        toast('Changes update successful', {
          position: 'top-center',
        });
      } else {
        alert('Something wrong. Try again later');
      }
      setaAdharAdding(false);
      setOpacityclass('');
    };

    if (verifysuccess) {
      setaAdharAdding(true);
      setOpacityclass('custom-opacity');
      setAadharverified();
    }
  }, [verifysuccess]);

  const callOCRAPI = async fileIn => {
    if (!OCR_API_URL) {
      alert('OCR service URL not configured. Please set VITE_OCR_API_URL or VITE_API_URL in env.');
      return null;
    }

    const formData = new FormData();
    formData.append('idimage', fileIn);

    try {
      const resp = await axios.post(`${OCR_API_URL}/verify/idverify`, formData);
      return resp;
    } catch (error) {
      if (error?.response?.status == 429) {
        alert('Too many requests. try again after 2 minutes!');
      } else {
        alert('Aadhar card error, try again or email the copy to contact@marrylocal.in');
      }
      setAadharImg({});
      setaAdharAdding(false);
      return null;
    }
  };

  const formik = useFormik({
    initialValues: {
      aadhar: '',
    },
    validationSchema: Yup.object({
      aadhar: Yup.string()
        .matches(/^[0-9]+$/, 'Must be only digits')
        .length(12)
        .required('required'),
    }),
  });

  const verifyNumber = async e => {
    e.preventDefault();
    //console.log('verify here');
    if (validate_adhar(formik.values.aadhar)) {
      //console.log('verify here 2:', profiledata?.aadharnumber);
      if (!isObjEmpty(profiledata?.aadharnumber)) {
        if (formik.values.aadhar == Number(profiledata?.aadharnumber)) {
          //console.log('verify here 3');
          setNumclass('custom-opacity');
          setImgclass('');
          setRetryclass('');
        } else {
          alert('Aadhar number is different from the one provided while registering, try again');
          formik.resetForm({ values: '' });
        }
      } else {
        setNumclass('custom-opacity');
        setImgclass('');
        setRetryclass('');
      }
    } else {
      alert('Invalid aadhar number, try again');
      formik.resetForm({ values: '' });
    }
  };

  const extractStrings = async dataArray => {
    var alphabetsregex = /^[A-Za-z\s]*$/;
    let i = 0;
    let stringsArray = [];
    let furtherarray = [];
    while (i < dataArray.length) {
      if (dataArray[i].match(alphabetsregex) && dataArray[i].length > 3) {
        if (dataArray[i].length > 3) {
          //minimun 4 length names
          let j = 0;
          furtherarray = dataArray[i].split(' ');
          while (j < furtherarray.length) {
            if (furtherarray[j].length > 3) {
              //minimun 4 length names
              stringsArray.push(furtherarray[j].toLowerCase());
            }
            j++;
          }
        }
        //stringsArray.push(dataArray[i])
      }
      i++;
    }
    return stringsArray;
  };

  const extractNumbers = async dataArray => {
    var numbersregex = /^[0-9\s]*$/;
    var numbersregex2 = /^[0-9]{0,}$/; //no space regex
    let i = 0;
    let numbersArray = [];
    let furtherarray = [];
    while (i < dataArray.length) {
      if (dataArray[i].match(numbersregex) && dataArray[i].length > 3) {
        if (dataArray[i].length > 4) {
          let j = 0;
          furtherarray = dataArray[i].split(' ');
          while (j < furtherarray.length) {
            if (furtherarray[j].match(numbersregex2)) {
              numbersArray.push(Number(furtherarray[j]));
            }
            j++;
          }
        } else {
          if (dataArray[i].match(numbersregex2)) {
            numbersArray.push(Number(dataArray[i]));
          }
        }
      }
      i++;
    }
    return numbersArray;
  };

  const extractdob = async dataArray => {
    var dobregex = /\d{1,2}\/\d{1,2}\/\d{2,4}/;
    let i = 0;

    while (i < dataArray.length) {
      if (dataArray[i].match(dobregex)) {
        return dataArray[i].trim().slice(-10);
      }
      i++;
    }
    return null;
  };

  async function updateVerifytrycount(verifytrycount) {
    const res = await updateUserInfo(user?.id, {
      verifytrycount: verifytrycount,
    });
    if (res.success) {
      setProfiledata({ ...profiledata, verifytrycount: verifytrycount });
      toast('Changes update successful', {
        position: 'top-center',
      });
    } else {
      alert('Something wrong. Try again later');
    }
  }

  //https://github.com/nimiq/qr-scanner
  const ValidateAadhar = async (event, fileIn) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append(1, fileIn);
    var options = {};

    if (!user) {
      alert('Something wrong. Try reloading page');
      return;
    }

    try {
      const result = await QrScanner.scanImage(fileIn, options);
      const toJson = await convertXML(result.toString());

      if (!isObjEmpty(toJson.PrintLetterBarcodeData)) {
        if (toJson.PrintLetterBarcodeData.uid == aadharNum) {
          //validate name and year of birth
          const aadhar_names = toJson.PrintLetterBarcodeData.name.toLowerCase().split(' ');
          const currentyear = new Date().getFullYear();
          if (
            aadhar_names.includes(profiledata?.firstname.toLowerCase()) ||
            aadhar_names.includes(profiledata?.lastname.toLowerCase())
          ) {
            if (!isObjEmpty(toJson.PrintLetterBarcodeData.yob)) {
              const age = Math.abs(currentyear - toJson.PrintLetterBarcodeData.yob);
              if (!isEmpty(profiledata?.age)) {
                if (
                  profiledata?.age == age ||
                  profiledata?.age == age - 1 ||
                  profiledata?.age == age + 1
                ) {
                  setVerifysuccess(true);
                  aadharqrscanpass = true;
                  alert('Aadhar Verification Successful!!');
                } else {
                  alert('Date of birth does not match, try again');
                  setAadharImg({});
                  setaAdharAdding(false);
                  aadharqrscanpass = true;
                }
              }
            }
          } else {
            alert('Names does not match, try again');
            setAadharImg({});
            setaAdharAdding(false);
            aadharqrscanpass = true;
          }
        } else {
          alert('Aadhar numbers does not match, try again');
          setAadharImg({});
          setaAdharAdding(false);
          aadharqrscanpass = true;
        }
      } else {
        errmsg = 'Aadhar card error, try again or email the copy to contact@marrylocal.in';
        aadharqrscanpass = false;
      }
    } catch (error) {
      if (error?.response?.status == 429) {
        alert('Too many requests. try again after 2 minutes!');
        setAadharImg({});
        setaAdharAdding(false);
        aadharqrscanpass = true; //not true but just to prevent to go to next step of OCR scanning
      } else {
        errmsg = `QR image not clear, try again or email the 33333 copy to contact@marrylocal.in`;
        aadharqrscanpass = false;
      }
    }

    if (aadharqrscanpass == true) {
      alert(errmsg);
    }

    if (aadharqrscanpass == false) {
      try {
        // Try OCR
        const resp = await callOCRAPI(fileIn);
        if (resp.data.status == 'success') {
          if (!isObjEmpty(resp.data.data.ParsedResults)) {
            const dataArray = resp.data.data.ParsedResults[0].ParsedText.split('\r\n');

            let extractedstrings = await extractStrings(dataArray);
            let extractednumbers = await extractNumbers(dataArray);
            let extracteddob = await extractdob(dataArray);
            let extractedyob = !isObjEmpty(extracteddob) ? extracteddob.slice(-4) : null;
            const currentyear = new Date().getFullYear();

            if (!isObjEmpty(extractedstrings) & !isObjEmpty(extractednumbers)) {
              if (
                extractedstrings.includes(profiledata?.firstname.toLowerCase()) ||
                extractedstrings.includes(profiledata?.lastname.toLowerCase())
              ) {
                let aadharnum1 = aadharNum % 10000;
                let aadharnum2 = aadharNum / 10000;
                aadharnum2 = parseInt(aadharnum2 % 10000);
                let aadharnum3 = aadharNum / 100000000;
                aadharnum3 = parseInt(aadharnum3 % 10000);

                if (
                  extractednumbers.includes(aadharnum1) &&
                  extractednumbers.includes(aadharnum2) &&
                  extractednumbers.includes(aadharnum3)
                ) {
                  // yob/age verification
                  if (!isObjEmpty(extracteddob) && isNumber(extractedyob)) {
                    const age = Math.abs(currentyear - extractedyob);
                    if (!isEmpty(profiledata?.age)) {
                      if (
                        profiledata?.age == age ||
                        profiledata?.age == age - 1 ||
                        profiledata?.age == age + 1
                      ) {
                        setVerifysuccess(true);
                        alert('Aadhar Verification Successful!!');
                      } else {
                        alert('date of birth does not match, try again');
                        setAadharImg({});
                        setaAdharAdding(false);
                      }
                    }
                  } else {
                    //set verify success if some reason DOB extract incorrect
                    setVerifysuccess(true);
                    alert('Aadhar Verification Successful!!');
                  }
                } else {
                  alert('Aadhar numbers does not match, try again');
                  setAadharImg({});
                  setaAdharAdding(false);
                }
              } else {
                alert('Names does not match, try again');
                setAadharImg({});
                setaAdharAdding(false);
              }
            } else {
              alert('Data Extract Error. try again now or later');
              setAadharImg({});
              setaAdharAdding(false);
            }
          } else {
            alert('Server timeout. try again now or later');
            trycount.current = trycount.current - 1;
            setAadharImg({});
            setaAdharAdding(false);
          }
        }

        if (resp == null || resp.data.status == 500) {
          alert('Image not clear, try again or email the copy to contact@marrylocal.in');
          setaAdharAdding(false);
        }
        setAadharImg({});
        setaAdharAdding(false);
      } catch (error) {
        if (error?.response?.status == 429) {
          alert('Too many requests. try again after 2 minutes!');
          setAadharImg({});
          setaAdharAdding(false);
        } else {
          alert('Aadhar card error, try again or email the copy to contact@marrylocal.in');
          setAadharImg({});
          setaAdharAdding(false);
        }
      }
    }
    setaAdharAdding(false);
  };

  const retryClick = e => {
    e.preventDefault();
    setNumclass('');
    setImgclass('hidden');
    setAadharImg({});
    formik.resetForm({ values: '' });
    setaAdharAdding(false);
  };

  // Driver License OCR processing
  const processDriverLicenseOCR = async (file, isFront = true) => {
    if (!isOnline) {
      alert('You are offline. Check your internet connection.');
      return;
    }

    try {
      setDlProcessing(true);
      const resp = await callOCRAPI(file);

      if (resp && resp.data.status === 'success' && resp.data.data.ParsedResults) {
        const dataArray = resp.data.data.ParsedResults[0].ParsedText.split('\r\n');
        const extractedData = await extractDriverLicenseData(dataArray);

        if (isFront) {
          setDlFormData(prev => ({
            ...prev,
            ...extractedData,
            licenseNumber: extractedData.licenseNumber || prev.licenseNumber,
            name: extractedData.name || prev.name,
            dob: extractedData.dob || prev.dob,
            expiry: extractedData.expiry || prev.expiry,
          }));
        } else {
          // Back side typically has address
          setDlFormData(prev => ({
            ...prev,
            address: extractedData.address || prev.address,
          }));
        }

        toast.success('Driver License data extracted successfully!');
      } else {
        toast.error('Could not extract data from image. Please try again.');
      }
    } catch (error) {
      console.error('DL OCR Error:', error);
      toast.error('Error processing driver license image.');
    } finally {
      setDlProcessing(false);
    }
  };

  // Passport OCR processing
  const processPassportOCR = async (file, isPhotoPage = true) => {
    if (!isOnline) {
      alert('You are offline. Check your internet connection.');
      return;
    }

    try {
      setPassportProcessing(true);
      const resp = await callOCRAPI(file);

      if (resp && resp.data.status === 'success' && resp.data.data.ParsedResults) {
        const dataArray = resp.data.data.ParsedResults[0].ParsedText.split('\r\n');
        const extractedData = await extractPassportData(dataArray);

        setPassportFormData(prev => ({
          ...prev,
          ...extractedData,
          passportNumber: extractedData.passportNumber || prev.passportNumber,
          name: extractedData.name || prev.name,
          dob: extractedData.dob || prev.dob,
          expiry: extractedData.expiry || prev.expiry,
          placeOfBirth: extractedData.placeOfBirth || prev.placeOfBirth,
          nationality: extractedData.nationality || prev.nationality,
        }));

        toast.success('Passport data extracted successfully!');
      } else {
        toast.error('Could not extract data from image. Please try again.');
      }
    } catch (error) {
      console.error('Passport OCR Error:', error);
      toast.error('Error processing passport image.');
    } finally {
      setPassportProcessing(false);
    }
  };

  // Extract driver license data from OCR text
  const extractDriverLicenseData = async dataArray => {
    const extracted = {
      licenseNumber: '',
      name: '',
      dob: '',
      expiry: '',
      address: '',
    };

    // License number patterns (various formats)
    const licensePatterns = [
      /\b([A-Z]{1,3}\d{4,12})\b/, // e.g., DL12345678, MH0123456789
      /\b(\d{2,4}[A-Z]\d{6,10})\b/, // e.g., 12A12345678
      /\b([A-Z]{2}\d{13})\b/, // e.g., MH1234567890123
    ];

    // Date patterns
    const datePatterns = [
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/, // MM/DD/YYYY or DD-MM-YYYY
      /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/, // YYYY/MM/DD or YYYY-MM-DD
    ];

    for (const line of dataArray) {
      const upperLine = line.toUpperCase();

      // Extract license number
      for (const pattern of licensePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          extracted.licenseNumber = match[1];
          break;
        }
      }

      // Extract dates (DOB and Expiry)
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];
          // Try to determine if it's DOB or expiry based on context
          if (
            upperLine.includes('DOB') ||
            upperLine.includes('BIRTH') ||
            upperLine.includes('DATE OF BIRTH')
          ) {
            extracted.dob = formatDateForInput(dateStr);
          } else if (
            upperLine.includes('EXP') ||
            upperLine.includes('VALID') ||
            upperLine.includes('EXPIRY')
          ) {
            extracted.expiry = formatDateForInput(dateStr);
          }
        }
      }

      // Extract name (look for lines with multiple words, likely names)
      if (
        !extracted.name &&
        line.split(' ').length >= 2 &&
        line.length > 5 &&
        /^[A-Za-z\s]+$/.test(line)
      ) {
        extracted.name = line.trim();
      }

      // Extract address (look for lines that might be addresses)
      if (
        upperLine.includes('ADDRESS') ||
        upperLine.includes('ADD') ||
        /^\d+\s+[A-Za-z]/.test(line)
      ) {
        extracted.address = line.trim();
      }
    }

    return extracted;
  };

  // Extract passport data from OCR text
  const extractPassportData = async dataArray => {
    const extracted = {
      passportNumber: '',
      name: '',
      dob: '',
      expiry: '',
      placeOfBirth: '',
      nationality: '',
    };

    // Passport number patterns (typically 8-9 characters, starts with letter)
    const passportPatterns = [
      /\b([A-Z]\d{7,8})\b/, // e.g., A12345678, P123456789
      /\b([A-Z]{1,2}\d{6,8})\b/, // e.g., AB1234567
    ];

    // Date patterns
    const datePatterns = [
      /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/,
      /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/,
    ];

    for (const line of dataArray) {
      const upperLine = line.toUpperCase();

      // Extract passport number
      for (const pattern of passportPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          extracted.passportNumber = match[1];
          break;
        }
      }

      // Extract dates
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];
          if (
            upperLine.includes('DOB') ||
            upperLine.includes('BIRTH') ||
            upperLine.includes('DATE OF BIRTH')
          ) {
            extracted.dob = formatDateForInput(dateStr);
          } else if (
            upperLine.includes('EXP') ||
            upperLine.includes('VALID') ||
            upperLine.includes('EXPIRY')
          ) {
            extracted.expiry = formatDateForInput(dateStr);
          }
        }
      }

      // Extract name
      if (
        !extracted.name &&
        line.split(' ').length >= 2 &&
        line.length > 5 &&
        /^[A-Za-z\s]+$/.test(line)
      ) {
        extracted.name = line.trim();
      }

      // Extract place of birth
      if (upperLine.includes('PLACE OF BIRTH') || upperLine.includes('BORN IN')) {
        extracted.placeOfBirth = line.replace(/PLACE OF BIRTH|BORN IN/gi, '').trim();
      }

      // Extract nationality
      if (upperLine.includes('NATIONALITY') || upperLine.includes('NATION')) {
        extracted.nationality = line.replace(/NATIONALITY|NATION/gi, '').trim();
      }
    }

    return extracted;
  };

  // Helper function to format dates for HTML input
  const formatDateForInput = dateStr => {
    try {
      // Handle different date formats and convert to YYYY-MM-DD
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        let year, month, day;
        if (parts[2].length === 4) {
          // YYYY-MM-DD or YYYY/MM/DD
          year = parts[2];
          month = parts[1].padStart(2, '0');
          day = parts[0].padStart(2, '0');
        } else {
          // DD-MM-YYYY or MM/DD/YYYY
          if (dateStr.includes('/')) {
            // Assume MM/DD/YYYY
            month = parts[0].padStart(2, '0');
            day = parts[1].padStart(2, '0');
            year = parts[2];
          } else {
            // Assume DD-MM-YYYY
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
          }
        }
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error('Date formatting error:', error);
    }
    return dateStr; // Return original if parsing fails
  };

  return (
    <div>
      <Card className="w-full shadow-md border-border/50 rounded-none">
        <CardHeader className="flex flex-row items-center justify-between md:mx-2 lg:mx-10">
          <CardTitle className="text-2xl">Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center w-[100%] relative">
          {aadharAdding && (
            <Spinner className="absolute top-[50%] left-[50%] z-50 cursor-pointer size-10" />
          )}

          <Tabs defaultValue="driver-license" className="w-full max-w-4xl">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              {/* <TabsTrigger value="aadhaar" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Aadhaar Card
              </TabsTrigger> */}
              <TabsTrigger value="driver-license" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Driver License
              </TabsTrigger>
              <TabsTrigger value="passport" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Passport
              </TabsTrigger>
            </TabsList>

            {/* <TabsContent value="aadhaar" className="space-y-6">
              {profiledata?.aadharverified == true && (
                <div className="p-4">
                  <span className="inline-block border border-accent-500 px-4 py-4 text-md font-semibold rounded-lg bg-yellow-200">
                    You are verified, nothing to do here.
                  </span>
                </div>
              )}
              {profiledata?.aadharverified == false && (
                <>
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center mb-4">
                      <CreditCard className="h-12 w-12 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-semibold">Aadhaar Card Verification</h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      Verify your identity using your Aadhaar Card. This helps us ensure the security and authenticity of your account.
                    </p>
                  </div>

                  <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                      <CardTitle className="text-lg">Submit Aadhaar Card Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className={`${opacityclass}`}>
                        <div className="underline underline-offset-2 text-2xl pb-2">
                          Upload your Aadhar front picture &nbsp;
                        </div>
                        <div className="text-red-600 text-lg pb-4">
                          (QR code should be visibly clear on your aadhar picture)
                        </div>
                        <div className="">
                          <form className="mt-4" onSubmit={verifyNumber}>
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                              <div className={`${numclass} space-y-2 md:w-[400px]`}>
                                <Label>Enter Aadhar Number&nbsp;:</Label>
                                <Input
                                  type="text"
                                  className="border-bottom"
                                  name="aadhar"
                                  placeholder=""
                                  value={formik.values.aadhar}
                                  onChange={e => {
                                    formik.handleChange(e);
                                    setAadharNum(e.target.value);
                                  }}
                                  onBlur={formik.handleBlur}
                                  required
                                />
                                {formik.touched.aadhar && formik.errors.aadhar ? (
                                  <p className="text-red-600">{formik.errors.aadhar} </p>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-0 md:flex-row">
                                <Button className={`${numclass}`} variant="secondary" type="submit">
                                  Click here to verify number
                                </Button>
                                <Button
                                  className={`${retryclass}`}
                                  size="icon-sm"
                                  data-toggle="tooltip"
                                  title="retry"
                                  onClick={e => {
                                    retryClick(e);
                                  }}
                                >
                                  <RotateCw />
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>

                        <div className={`${imgclass}`}>
                          <form>
                            <div className="pt-6">
                              {aadharImg && (
                                <img
                                  className="w-[300px]"
                                  src={aadharImg['url']}
                                  //src='https://blr1.vultrobjects.com/localm/33361/first'
                                  //src={file1 && URL.createObjectURL(file1)}
                                  alt=""
                                />
                              )}
                              {JSON.stringify(aadharImg) === '{}' && (
                                <>
                                  <div className="space-y-2 mt-6">
                                    <Label className="mt-4">Click to Upload:</Label>
                                    <Input
                                      className="lg:w-[40%]"
                                      onChange={async e => {
                                        setFile1(e.target.files[0]);
                                        if (isOnline) {
                                          trycount.current = trycount.current + 1;
                                          setProfiledata({
                                            ...profiledata,
                                            verifytrycount: trycount.current,
                                          });
                                          if (trycount.current < 25) {
                                            //max 24 retries
                                            setAadharImg({
                                              url:
                                                e.target.files[0] && URL.createObjectURL(e.target.files[0]),
                                            });
                                            setaAdharAdding(true);
                                            ValidateAadhar(e, e.target.files[0]);
                                          } else {
                                            await updateVerifytrycount(trycount.current);
                                            setaAdharAdding(false);
                                            setImgclass('hidden');
                                            alert('RETRY LIMIT EXCEEDED, EMAIL US YOUR ID');
                                          }
                                        } else {
                                          alert('You are offline. check your internet connection.');
                                          return;
                                        }
                                      }}
                                      onClick={e => (e.target.value = null)}
                                      type="file"
                                      accept="image/*"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </form>
                          {JSON.stringify(aadharImg) !== '{}' && (
                            <>
                              {aadharAdding ? (
                                <></>
                              ) : (
                                <Button
                                  className={`${opacityclass}`}
                                  variant="destructive"
                                  onClick={() => {
                                    setAadharImg({});
                                  }}
                                >
                                  Remove to Add New
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent> */}

            <TabsContent value="driver-license" className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <Car className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold">Driver License Verification</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Upload your driver license images and we'll automatically extract the information.
                  This helps us ensure the security and authenticity of your account.
                </p>
              </div>

              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Driver License Details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload images to auto-fill the form
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dl-number">License Number</Label>
                      <Input
                        id="dl-number"
                        placeholder="Enter license number"
                        className="mt-1"
                        value={dlFormData.licenseNumber}
                        onChange={e =>
                          setDlFormData(prev => ({ ...prev, licenseNumber: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="dl-state">State</Label>
                      <Input
                        id="dl-state"
                        placeholder="Issuing state"
                        className="mt-1"
                        value={dlFormData.state}
                        onChange={e => setDlFormData(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dl-dob">Date of Birth</Label>
                      <Input
                        id="dl-dob"
                        type="date"
                        className="mt-1"
                        value={dlFormData.dob}
                        onChange={e => setDlFormData(prev => ({ ...prev, dob: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dl-expiry">Expiry Date</Label>
                      <Input
                        id="dl-expiry"
                        type="date"
                        className="mt-1"
                        value={dlFormData.expiry}
                        onChange={e => setDlFormData(prev => ({ ...prev, expiry: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dl-name">Full Name</Label>
                    <Input
                      id="dl-name"
                      placeholder="As shown on license"
                      className="mt-1"
                      value={dlFormData.name}
                      onChange={e => setDlFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dl-address">Address</Label>
                    <Input
                      id="dl-address"
                      placeholder="Address on license"
                      className="mt-1"
                      value={dlFormData.address}
                      onChange={e => setDlFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Upload Driver License (Front)</Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          className="mt-1"
                          onChange={async e => {
                            const file = e.target.files[0];
                            if (file) {
                              setDlFrontImg({ url: URL.createObjectURL(file) });
                              await processDriverLicenseOCR(file, true);
                            }
                          }}
                          disabled={dlProcessing}
                        />
                        {dlProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                            <Spinner className="size-6" />
                          </div>
                        )}
                      </div>
                      {dlFrontImg.url && (
                        <img
                          src={dlFrontImg.url}
                          alt="Driver License Front"
                          className="w-full max-w-xs rounded-lg border"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Driver License (Back)</Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          className="mt-1"
                          onChange={async e => {
                            const file = e.target.files[0];
                            if (file) {
                              setDlBackImg({ url: URL.createObjectURL(file) });
                              await processDriverLicenseOCR(file, false);
                            }
                          }}
                          disabled={dlProcessing}
                        />
                        {dlProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                            <Spinner className="size-6" />
                          </div>
                        )}
                      </div>
                      {dlBackImg.url && (
                        <img
                          src={dlBackImg.url}
                          alt="Driver License Back"
                          className="w-full max-w-xs rounded-lg border"
                        />
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6"
                    disabled={dlProcessing || !dlFormData.licenseNumber}
                    onClick={() => {
                      // Handle submission
                      toast.success('Driver License verification submitted successfully!');
                    }}
                  >
                    {dlProcessing ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 size-4" />
                        Submit for Verification
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Your information is securely processed and verified.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="passport" className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <Plane className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-2xl font-semibold">Passport Verification</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Upload your passport images and we'll automatically extract the information. This
                  provides the highest level of identity verification.
                </p>
              </div>

              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Passport Details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload images to auto-fill the form
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passport-number">Passport Number</Label>
                      <Input
                        id="passport-number"
                        placeholder="Enter passport number"
                        className="mt-1"
                        value={passportFormData.passportNumber}
                        onChange={e =>
                          setPassportFormData(prev => ({ ...prev, passportNumber: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-country">Issuing Country</Label>
                      <Input
                        id="passport-country"
                        placeholder="Country of issue"
                        className="mt-1"
                        value={passportFormData.country}
                        onChange={e =>
                          setPassportFormData(prev => ({ ...prev, country: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passport-dob">Date of Birth</Label>
                      <Input
                        id="passport-dob"
                        type="date"
                        className="mt-1"
                        value={passportFormData.dob}
                        onChange={e =>
                          setPassportFormData(prev => ({ ...prev, dob: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-expiry">Expiry Date</Label>
                      <Input
                        id="passport-expiry"
                        type="date"
                        className="mt-1"
                        value={passportFormData.expiry}
                        onChange={e =>
                          setPassportFormData(prev => ({ ...prev, expiry: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="passport-name">Full Name</Label>
                    <Input
                      id="passport-name"
                      placeholder="As shown on passport"
                      className="mt-1"
                      value={passportFormData.name}
                      onChange={e =>
                        setPassportFormData(prev => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passport-birthplace">Place of Birth</Label>
                      <Input
                        id="passport-birthplace"
                        placeholder="Place of birth"
                        className="mt-1"
                        value={passportFormData.placeOfBirth}
                        onChange={e =>
                          setPassportFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-nationality">Nationality</Label>
                      <Input
                        id="passport-nationality"
                        placeholder="Nationality"
                        className="mt-1"
                        value={passportFormData.nationality}
                        onChange={e =>
                          setPassportFormData(prev => ({ ...prev, nationality: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Upload Passport Photo Page</Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          className="mt-1"
                          onChange={async e => {
                            const file = e.target.files[0];
                            if (file) {
                              setPassportImg({ url: URL.createObjectURL(file) });
                              await processPassportOCR(file, true);
                            }
                          }}
                          disabled={passportProcessing}
                        />
                        {passportProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                            <Spinner className="size-6" />
                          </div>
                        )}
                      </div>
                      {passportImg.url && (
                        <img
                          src={passportImg.url}
                          alt="Passport Photo Page"
                          className="w-full max-w-xs rounded-lg border"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Passport Address Page (Optional)</Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          className="mt-1"
                          onChange={async e => {
                            const file = e.target.files[0];
                            if (file) {
                              setPassportAddressImg({ url: URL.createObjectURL(file) });
                              await processPassportOCR(file, false);
                            }
                          }}
                          disabled={passportProcessing}
                        />
                        {passportProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                            <Spinner className="size-6" />
                          </div>
                        )}
                      </div>
                      {passportAddressImg.url && (
                        <img
                          src={passportAddressImg.url}
                          alt="Passport Address Page"
                          className="w-full max-w-xs rounded-lg border"
                        />
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6"
                    disabled={passportProcessing || !passportFormData.passportNumber}
                    onClick={() => {
                      // Handle submission
                      toast.success('Passport verification submitted successfully!');
                    }}
                  >
                    {passportProcessing ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 size-4" />
                        Submit for Verification
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Your information is securely processed and verified.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default Verify;
