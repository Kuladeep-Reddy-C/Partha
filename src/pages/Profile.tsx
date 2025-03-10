import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, User, AlertCircle, CheckCircle2, Phone, MapPin, Calendar, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  dob: z.string().refine(val => Boolean(val), { 
    message: 'Date of birth is required' 
  }),
  mobileNumber: z.string()
    .min(10, 'Mobile number must be at least 10 digits')
    .refine(val => /^\+?[0-9\s-()]+$/.test(val), {
      message: 'Please enter a valid mobile number',
    }),
  address: z.string().min(5, 'Address must be at least 5 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserData {
  username?: string;
  dob?: string;
  mobileNumber?: string;
  address?: string;
  photoURL?: string;
}

export default function Profile() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [fetchingUserData, setFetchingUserData] = useState(true);
  const { currentUser, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: currentUser?.displayName || '',
      dob: '',
      mobileNumber: '',
      address: '',
    },
  });

  // Fetch user data from Firestore on component mount
  useEffect(() => {
    async function fetchUserData() {
      if (!currentUser) return;
      
      try {
        setFetchingUserData(true);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          
          // Set profile image if it exists
          if (userData.photoURL) {
            setProfileImage(userData.photoURL);
          } else if (currentUser.photoURL) {
            setProfileImage(currentUser.photoURL);
          }
          
          // Reset form with retrieved data
          reset({
            username: userData.username || currentUser.displayName || '',
            dob: userData.dob || '',
            mobileNumber: userData.mobileNumber || '',
            address: userData.address || '',
          });
        } else {
          // If no document exists, just use the currentUser data
          reset({
            username: currentUser.displayName || '',
            dob: '',
            mobileNumber: '',
            address: '',
          });
          
          if (currentUser.photoURL) {
            setProfileImage(currentUser.photoURL);
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        // We're not setting an error message here anymore
      } finally {
        setFetchingUserData(false);
      }
    }
    
    fetchUserData();
  }, [currentUser, reset]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to log out.');
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setIsLoading(true);
      const fileRef = ref(storage, `profileImages/${currentUser?.uid}/${Date.now()}-${file.name}`);
      
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      
      setProfileImage(downloadURL);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to upload image.');
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setMessage('');
      setError('');
      setIsLoading(true);
      
      // Update user profile with displayName and photoURL
      await updateUserProfile(data.username, profileImage || undefined);
      
      // Store additional user data in Firestore
      if (currentUser) {
        await setDoc(doc(db, "users", currentUser.uid), {
          username: data.username,
          dob: data.dob,
          mobileNumber: data.mobileNumber,
          address: data.address,
          photoURL: profileImage,
          email: currentUser.email,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 mb-6 text-sm text-red-500 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-4 mb-6 text-sm text-green-500 bg-green-50 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
                <p>{message}</p>
              </div>
            )}

            {fetchingUserData ? (
              <div className="py-10 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2 text-gray-600">Loading profile...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center">
                    <div 
                      onClick={handleImageClick} 
                      className="relative cursor-pointer mr-4"
                    >
                      <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1">
                        <Upload className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageChange}
                        ref={fileInputRef}
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500">
                        Click to upload a profile picture (JPG, PNG)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Max file size: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your email address cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      className="pl-10"
                      error={errors.username?.message}
                      {...register('username')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="dob"
                      type="date"
                      className="pl-10"
                      error={errors.dob?.message}
                      {...register('dob')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      className="pl-10"
                      placeholder="+1 (123) 456-7890"
                      error={errors.mobileNumber?.message}
                      {...register('mobileNumber')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="address"
                      type="text"
                      className="pl-10"
                      error={errors.address?.message}
                      {...register('address')}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="flex justify-center py-2 px-4"
                    isLoading={isLoading}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}