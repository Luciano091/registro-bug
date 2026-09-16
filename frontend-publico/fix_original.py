import sys

with open('src/components/CheckoutModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
'''                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}''',
'''                </div>
              )}
            </div>
            </div>
          )}
        </div>

        {/* Footer */}'''
)

with open('src/components/CheckoutModal.tsx', 'w') as f:
    f.write(content)
