import firebase_admin
from firebase_admin import credentials, firestore, auth

# 1. Initialize Firebase Admin (Apni service account key JSON file yahan lagayein)
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)

db = firestore.client()

# 2. Fetch all users from Firebase Auth
page = auth.list_users()
count = 0

while page:
    for user in page.users:
        # Check if user exists in Firestore 'users' collection
        user_ref = db.collection('users').document(user.uid)
        snap = user_ref.get()
        
        if not snap.exists:
            # If missing, write them to Firestore
            user_ref.set({
                'uid': user.uid,
                'email': user.email,
                'displayName': user.display_name or 'Pahari User',
                'role': 'user',
                'disabled': user.disabled,
                'emailVerified': user.email_verified,
                'createdAt': firestore.SERVER_TIMESTAMP
            })
            count += 1
            print(f"Added missing user to collection: {user.email}")
            
    # Fetch next batch of users if more than 1000
    if page.has_next_page:
        page = page.get_next_page()
    else:
        page = None

print(f"Sync complete. {count} missing records successfully written to collection.")