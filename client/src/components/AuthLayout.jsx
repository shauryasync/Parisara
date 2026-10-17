const AuthLayout = ({ formTitle, formDescription, children, footer }) => (
  <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-[0_24px_80px_rgba(27,82,64,0.12)] md:grid-cols-2">
      <aside className="relative flex min-h-56 items-center justify-center overflow-hidden bg-[#123d2b] p-6 text-white sm:min-h-64 sm:p-9 md:min-h-[620px] md:p-11">
        <img
          src="/Community_Under_floating_Earth.png"
          alt="A diverse community gathered beneath a floating Earth"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </aside>

      <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12">
        <div className="mb-7">
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-emerald-950 sm:text-3xl">
            {formTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">{formDescription}</p>
        </div>

        {children}
        {footer}
      </div>
    </div>
  </section>
);

export default AuthLayout;
